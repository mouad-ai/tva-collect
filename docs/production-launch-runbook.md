# TVA Collect Production Launch Runbook

Use this file as the final launch gate before putting real cabinet/client documents into TVA Collect.

## 1. Configure Production Environment

Create `.env.production` on the VPS from `deploy/.env.production.example`.

Mandatory rules:

- `NODE_ENV=production`
- `AUTH_SECRET` and `NEXTAUTH_SECRET` must be long random values, not demo strings.
- `APP_URL` and `NEXTAUTH_URL` must be real HTTPS URLs.
- `UPLOAD_STORAGE=s3`.
- MinIO/S3 variables must be real and private.
- `EMAIL_PROVIDER=smtp`.
- SMTP variables must be real.
- `ADMIN_EMAIL` must be your SaaS admin email.

Generate secrets:

```bash
openssl rand -base64 48
```

## 2. Build And Start

### First TLS Bootstrap

On a brand-new VPS, certificates do not exist yet. Use the HTTP-only bootstrap config first:

```bash
cp deploy/nginx/tvacollect-bootstrap.conf deploy/nginx/tvacollect.conf
docker compose --env-file .env.production -f docker-compose.prod.yml up -d nginx
docker compose --env-file .env.production -f docker-compose.prod.yml --profile certbot run --rm certbot
git checkout -- deploy/nginx/tvacollect.conf
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

If this is not a Git checkout, restore `deploy/nginx/tvacollect.conf` from your repository copy after Certbot succeeds.

### Normal App Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

MinIO notes:

- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` are only for MinIO administration.
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` are the app credentials.
- The `minio-init` service creates the bucket, blocks anonymous access, creates the app user, and attaches a bucket-only policy.
- The MinIO console is bound to `127.0.0.1:9001`, not public internet.

The app container runs:

```bash
npx prisma migrate deploy
npm run start
```

TLS note:

- The Nginx config expects certificates under `deploy/certbot/conf/live/app.tvacollect.com`.
- For the first launch, use `deploy/nginx/tvacollect-bootstrap.conf` for the ACME challenge, then restore the HTTPS config.
- After certificates exist, restart `nginx`.

## 3. Create The First SaaS Admin

Run this once after the database is reachable:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run create-admin
```

Use a strong password. Do not use demo passwords.

## 4. Run Production Gate

From inside the app container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run production:check
```

Optional live HTTP health check:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -e CHECK_HTTP_HEALTH=1 app npm run production:check
```

The gate must show only `OK` lines.

## 5. Verify Services

```bash
curl -f https://app.tvacollect.com/api/health
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Expected:

- app healthy
- postgres healthy
- minio healthy
- nginx running
- `/api/health` returns database ok

## 6. Manual Acceptance Flow

Do this before real client files:

1. Log in as SaaS ADMIN.
2. Create a cabinet from `/admin/firms/new`.
3. Copy or send the owner invite.
4. Owner accepts invite and sets password.
5. Owner invites an assistant from `/app/settings/team`.
6. Create one client.
7. Create one active TVA collection.
8. Open upload link from a phone.
9. Upload PDF/image test files.
10. Verify document appears in `/app/documents`.
11. Mark one file valid and one file rejected.
12. Generate a reminder.
13. Export CSV.
14. Suspend the cabinet and verify app/upload blocking.
15. Reactivate the cabinet.

## 7. Backup Drill

Before production, run a real restore drill:

- backup PostgreSQL
- backup MinIO volume/bucket
- restore to a separate test VPS or database
- confirm login, documents, downloads, and audit events still work

## 8. Production Definition Of Ready

TVA Collect is production-ready only when:

- `npm run production:check` passes in the production container.
- `/api/health` is healthy over HTTPS.
- SMTP sends invite and reset emails.
- MinIO/S3 upload and download works with private files.
- Backup and restore has been tested.
- SaaS ADMIN can create firm + owner.
- Owner can invite team.
- Public upload works from mobile.
- Suspended firms are blocked.
