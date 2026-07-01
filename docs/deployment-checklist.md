# TVA Collect Production Deployment Checklist

## 1. Deployment Status Rule

Deploy as real production only when every critical blocker below is complete.

If any item is missing, deploy only as:

- demo
- internal testing
- pilot without real client files

## 2. Critical Blockers

- Safe SaaS `ADMIN` bootstrap exists through `npm run create-admin`.
- SaaS `ADMIN` has `firmId = null`.
- `ADMIN` creates cabinet + first owner from `/admin/firms/new`.
- Cabinet `OWNER` accepts invite and sets password.
- Cabinet `OWNER` or `MANAGER` invites assistants from `/app/settings/team`.
- Clients do not create accounts and use `/upload/[token]` only.
- RBAC blocks unauthorized admin, billing, team, and mutation actions.
- Session max age and idle expiry are configured.
- Login and public upload rate limiting are enabled.
- Upload token expiry is enabled.
- Suspended/cancelled firms are blocked in the app and public upload.
- Tenant isolation tests pass.
- Soft delete and recovery work from `/app/trash`.
- `/api/health` returns healthy status.
- Backup and restore strategy is documented and tested.

## 3. Production Environment

Before configuring production URLs, buy the first domain and configure DNS. Use the cheaper `.com` strategy in [`docs/domain-dns-strategy.md`](domain-dns-strategy.md): start with `tvacollect.com` or a close alternative, then buy `tvacollect.ma` later.

Create production `.env` with:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=very-long-random-secret
NEXTAUTH_SECRET=very-long-random-secret
NEXTAUTH_URL=https://app.tvacollect.ma
APP_URL=https://app.tvacollect.ma

UPLOAD_STORAGE=s3
S3_ENDPOINT=https://...
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_REGION=us-east-1

EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@tvacollect.ma

ADMIN_EMAIL=your@email.com
ADMIN_NAME="TVA Collect Admin"
```

Never use in production:

- `dev-secret-change-me`
- `password123`
- demo users
- demo passwords
- local-only uploads for real client files

## 4. Technical Deployment Steps

For the recommended VPS stack, follow [`docs/vps-docker-minio-deployment.md`](vps-docker-minio-deployment.md). It uses Docker Compose with the app, PostgreSQL, Nginx, and private MinIO object storage.

1. Configure production `.env`.
2. Provision PostgreSQL.
3. Provision S3-compatible object storage and backup/replication.
4. Configure SMTP.
5. Run `npm install`.
6. Run `npx prisma generate`.
7. Run `npx prisma migrate deploy`.
8. Run `npm run create-admin`.
9. Run `npm run release:check`.
10. Start with `npm run start` behind HTTPS reverse proxy.
11. Open `/api/health`.
12. Login as SaaS `ADMIN`.
13. Create first cabinet and owner.
14. Confirm owner invite/password setup.
15. Run one upload/download test using a non-sensitive file.

## 5. Backup Check

Before accepting real client files:

- Test PostgreSQL backup.
- Test PostgreSQL restore into a clean database.
- Test upload storage backup/replication.
- Verify one restored document download.
- Record restore steps and responsible person.
