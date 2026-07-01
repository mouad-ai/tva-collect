# Backup and Restore

TVA Collect stores operational data in PostgreSQL and uploaded files either in the directory configured by `LOCAL_UPLOAD_DIR` or in S3-compatible storage when `UPLOAD_STORAGE=s3`.

## Database Backup

```bash
pg_dump "$DATABASE_URL" --format=custom --file=tvacollect-$(date +%Y%m%d-%H%M%S).dump
```

## Database Restore

Restore into an empty database:

```bash
pg_restore --dbname "$DATABASE_URL" --clean --if-exists tvacollect-YYYYMMDD-HHMMSS.dump
```

## Upload Storage Backup

For local storage, back up the upload directory:

```bash
tar -czf uploads-$(date +%Y%m%d-%H%M%S).tar.gz "$LOCAL_UPLOAD_DIR"
```

Restore uploads before serving downloads:

```bash
mkdir -p "$LOCAL_UPLOAD_DIR"
tar -xzf uploads-YYYYMMDD-HHMMSS.tar.gz -C /
```

For S3-compatible storage, enable bucket versioning if your provider supports it, and schedule a separate object backup or replication policy. At minimum, run a regular sync to a second bucket/account:

```bash
aws s3 sync "s3://$S3_BUCKET" "s3://$S3_BACKUP_BUCKET/tvacollect-$(date +%Y%m%d)" --endpoint-url "$S3_ENDPOINT"
```

Restore by syncing the selected backup prefix back into the active bucket:

```bash
aws s3 sync "s3://$S3_BACKUP_BUCKET/tvacollect-YYYYMMDD" "s3://$S3_BUCKET" --endpoint-url "$S3_ENDPOINT"
```

Use provider-native lifecycle rules for old temporary exports, but never purge active client documents without a verified database backup and a restore drill.

## Restore Drill Checklist

- Stop writes or put the app in maintenance mode.
- Restore PostgreSQL backup.
- Restore upload storage.
- Run `npx prisma migrate deploy`.
- Start the app.
- Check `/api/health`.
- Verify login, document list, public upload page, and one protected download.
