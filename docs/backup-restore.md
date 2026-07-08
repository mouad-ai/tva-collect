# Backup and Restore

TVA Collect stores operational data in PostgreSQL and uploaded files either in the directory configured by `LOCAL_UPLOAD_DIR` or in S3-compatible storage when `UPLOAD_STORAGE=s3`. This product holds real client financial documents — treat backups as mandatory infrastructure, not an optional extra, before onboarding real cabinets.

## Automated backup (recommended)

Two scripts are provided next to `docker-compose.prod.yml`:

- `scripts/backup.sh` — dumps PostgreSQL, mirrors/archives uploaded files, applies retention, optionally pushes off-site.
- `scripts/restore.sh` — restores a database dump and (optionally) uploaded files, then runs migrations.

Both read credentials from `.env.production` at run time — no secrets are hardcoded in the scripts.

### One-time setup on the VPS

```bash
cd /path/to/tva-collect
chmod +x scripts/backup.sh scripts/restore.sh
mkdir -p backups
```

### Run a backup manually

```bash
./scripts/backup.sh
```

This writes to `./backups/database/tvacollect-<timestamp>.dump` and `./backups/uploads/...`, then deletes anything older than the retention window (default **14 days**, override with `BACKUP_RETENTION_DAYS` in `.env.production`).

### Schedule it daily with cron

```bash
crontab -e
```

Add (adjust the path; this example runs at 03:15 server time and logs output):

```cron
15 3 * * * cd /path/to/tva-collect && ./scripts/backup.sh >> /var/log/tvacollect-backup.log 2>&1
```

### Retention policy

Default: **keep 14 days** of local backups. For a real pilot with paying cabinets, a more defensible policy is:

- Daily backups kept **14 days** locally (`BACKUP_RETENTION_DAYS=14`).
- Weekly backups pushed **off-site** and kept **90 days** (see below) — a single VPS is a single point of failure; if it is lost, local-only backups are lost with it.

### Off-site copy (strongly recommended before real client data)

Set `BACKUP_REMOTE` in `.env.production` to an [rclone](https://rclone.org/) remote (e.g. a second object storage account/provider) and install `rclone` on the VPS — `backup.sh` will push a copy automatically when both are present:

```bash
# .env.production
BACKUP_REMOTE=b2:tvacollect-backups
```

If you don't want to adopt rclone, at minimum copy `./backups/` to a separate machine/provider on a schedule (`rsync`, a second VPS, or your provider's snapshot feature) — do not rely solely on backups stored on the same disk as the live database.

### Restore

```bash
./scripts/restore.sh backups/database/tvacollect-20260101-031500.dump backups/uploads/uploads-20260101-031500.tar.gz
```

The script asks for explicit confirmation (`restore`) before touching data, stops the app, restores the database, restores uploads if a source is given, re-applies Prisma migrations, then restarts the app.

## Manual commands (what the scripts do, if you need to run them by hand)

### Database backup

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > tvacollect-$(date +%Y%m%d-%H%M%S).dump
```

Without Docker (direct `DATABASE_URL` access):

```bash
pg_dump "$DATABASE_URL" --format=custom --file=tvacollect-$(date +%Y%m%d-%H%M%S).dump
```

### Database restore

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < tvacollect-YYYYMMDD-HHMMSS.dump
```

### Upload storage backup (local storage)

```bash
tar -czf uploads-$(date +%Y%m%d-%H%M%S).tar.gz "$LOCAL_UPLOAD_DIR"
```

Restore uploads before serving downloads:

```bash
mkdir -p "$LOCAL_UPLOAD_DIR"
tar -xzf uploads-YYYYMMDD-HHMMSS.tar.gz -C /
```

### Upload storage backup (S3/MinIO)

```bash
mc mirror --overwrite "tvacollect/$S3_BUCKET" ./backups/uploads/$(date +%Y%m%d-%H%M%S)
```

Restore by mirroring the selected backup back into the bucket:

```bash
mc mirror --overwrite ./backups/uploads/YYYYMMDD-HHMMSS "tvacollect/$S3_BUCKET"
```

For managed S3-compatible storage, also enable provider-side bucket versioning if available — it's a free extra safety net on top of the mirror above.

Never purge active client documents without a verified database backup and a restore drill.

## Restore Drill Checklist

Run this at least once before onboarding real pilot cabinets, and again whenever the infrastructure changes meaningfully:

- Stop writes or put the app in maintenance mode.
- Restore the PostgreSQL backup (`./scripts/restore.sh ...` or the manual command above).
- Restore upload storage.
- Run `node node_modules/prisma/build/index.js migrate deploy`.
- Start the app.
- Check `/api/health`.
- Verify login, document list, public upload page, and one protected download.
- Record the date of the drill and how long it took — that's your real Recovery Time Objective (RTO), not a guess.
