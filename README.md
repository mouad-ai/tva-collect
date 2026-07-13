# TVA Collect

TVA Collect is a focused B2B SaaS MVP for Moroccan accounting firms. It helps a cabinet collect monthly TVA documents from clients through secure upload links, track missing documents, copy reminder messages, and export collection status.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Signed-cookie credentials auth with role checks and session expiry
- Local file storage abstraction for MVP uploads

**Requires Node.js 20+** (Next.js 16 needs 18.18+ minimum; the production Docker image uses Node 22 — see `.nvmrc`). Running with an older Node will fail with cryptic install/build errors, not a clear version message.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Run migrations:

```bash
npx prisma migrate dev
```

5. Seed demo data (optional, safe to re-run — see `docs/demo-pilot-guide.md` for details):

```bash
ALLOW_DEMO_SEED=true DEMO_PASSWORD='Choose-A-Strong-One-1!' npx prisma db seed
```

6. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Demo Login

The seed script never hardcodes a password — it's whatever `DEMO_PASSWORD` you set when running it (step 5 above). After seeding:

- Cabinet owner: `demo@tvacollect.com`
- Cabinet assistant: `assistant-demo@tvacollect.com`
- Trial cabinet owner (second firm, for admin-list variety): `essai@tvacollect.com`

The seed does **not** create a platform `ADMIN` account. Create/verify one separately:

```bash
npm run create-admin
```

Before putting real client files into production, run the production gate from the production environment:

```bash
npm run production:check
```

Full launch sequence: `docs/production-launch-runbook.md`.

## Main Routes

- `/` landing page
- `/pricing` pricing page
- `/contact` lead capture
- `/login` cabinet login
- `/app` dashboard
- `/app/clients` clients
- `/app/collections` collection periods
- `/app/documents` uploaded documents
- `/app/trash` soft-deleted recovery
- `/app/tva-readiness` TVA preparation readiness
- `/app/tva-risk-register` TVA risk register
- `/app/tva-filing` TVA filing and payment tracking
- `/app/tva-portfolio-exposure` TVA advisory and cashflow exposure
- `/app/fiscal-audits` fiscal audit defense
- `/app/settings` firm settings
- `/app/settings/team` cabinet team invitations
- `/app/settings/fiscal-config` fiscal TVA configuration
- `/admin/firms/new` create cabinet + owner
- `/admin/users` platform user management
- `/admin/invites` invite tracking
- `/invite/[token]` password setup page
- `/admin/release-checklist` final release checklist
- `/upload/[token]` public client upload page
- `/api/health` app/database health check

## Completed MVP Features

- SaaS admin and cabinet owner login with hashed passwords
- Tenant provisioning: admin creates firm + owner invite
- Firm-scoped clients CRUD
- Monthly TVA collection periods
- Add clients to collection periods
- Secure random upload token per client collection
- Upload token expiry/disable fields
- Role-based admin and billing access checks
- Soft delete and restore for key records
- Document security scan foundation for uploaded files
- Health endpoint and production Dockerfile
- Public upload page without client account
- Local file uploads with type and size validation
- Required document checklist and missing/received tracking
- Status badges for collection progress
- Copy upload link
- Copy WhatsApp and email reminder messages, with reminder logs
- CSV export for collection status
- Documents page with filters and individual downloads
- Firm settings for profile, default required documents, and reminder template
- Lead capture form stored in the database
- Docker Compose for local PostgreSQL
- Prisma schema, migration, and seed data

## Skipped For MVP

- Payment checkout
- WhatsApp Business API
- OCR and invoice parsing
- DGI integration
- ZIP download of all files
- Client account portal

## Known Limitations

- Reminders can send a real email (`sendReminderEmail`) and open a WhatsApp deep link with the message pre-filled — but there is still no automatic/scheduled reminder job; a human has to trigger each one.
- There is no ZIP export in this MVP.
- The status logic is intentionally simple and document-level classification is manual.
- Malware scanning is pluggable: if `CLAMAV_HOST` is set, uploads are streamed to a real clamd daemon; if unset, files are only checked for a valid extension/MIME/content-signature (no real antivirus scan) — see `lib/file-security.ts`.
- Login/upload rate limits are stored in PostgreSQL. For very high traffic, move them to Redis or another purpose-built shared store. If the rate-limit table is unreachable, requests are currently allowed through rather than blocked (fail-open) — see `lib/rate-limit.ts`.
- Uploads support `UPLOAD_STORAGE=local` and S3-compatible `UPLOAD_STORAGE=s3`; production is designed for private MinIO.
- Local uploads are scoped under `uploads/`; use MinIO/S3-compatible storage before real client files.
- No APM/error-tracking or uptime monitoring is wired in — `/api/health` checks DB connectivity only, not storage.

## Security Environment

Production must set `AUTH_SECRET` or `NEXTAUTH_SECRET`; the app fails safely without one in production.

Do not deploy real client files with `dev-secret-change-me`, `password123`, demo passwords, or local-only upload storage.

Before final deployment, choose the domain and DNS setup from [`docs/domain-dns-strategy.md`](docs/domain-dns-strategy.md). Cheapest clean path: buy `.com` first, use Cloudflare DNS, deploy the app on `app.tvacollect.com`, and buy `.ma` later.

Recommended self-hosted stack is documented in [`docs/vps-docker-minio-deployment.md`](docs/vps-docker-minio-deployment.md): VPS + Docker Compose + PostgreSQL + Nginx + private MinIO storage.

Minimum production `.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=very-long-random-secret
NEXTAUTH_SECRET=very-long-random-secret
NEXTAUTH_URL=https://app.tvacollect.ma
APP_URL=https://app.tvacollect.ma

UPLOAD_STORAGE=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=tvacollect-uploads
S3_ACCESS_KEY=tvacollect-app
S3_SECRET_KEY=very-long-minio-app-user-secret
S3_REGION=us-east-1
MINIO_ROOT_USER=very-long-minio-root-user
MINIO_ROOT_PASSWORD=very-long-minio-root-password

EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@tvacollect.ma

ADMIN_EMAIL=your@email.com
```

Session and upload token controls:

- `SESSION_MAX_AGE_SECONDS`
- `SESSION_IDLE_TIMEOUT_SECONDS`
- `UPLOAD_TOKEN_TTL_DAYS`
- `MAX_UPLOAD_SIZE_MB`

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run release:check
npm run create-admin
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
docker compose up -d
```

Backup and restore notes are in [`docs/backup-restore.md`](docs/backup-restore.md).

## Final Release Check

Before showing TVA Collect to a real cabinet, run:

```bash
npm run create-admin
npx prisma migrate deploy
npm run release:check
```

Critical blockers that must be green before real production:

- Safe SaaS `ADMIN` exists with `firmId = null`.
- `ADMIN` creates firm + owner from `/admin/firms/new`.
- Owner accepts invite and invites assistants from `/app/settings/team`.
- RBAC blocks assistant/read-only access to billing/admin.
- Session expiry and login rate limiting are configured.
- Upload token expiry is enabled.
- Suspended/cancelled firms cannot use app operations or public uploads.
- Tenant isolation tests pass.
- Soft delete/recovery works from `/app/trash`.
- `/api/health` is healthy.
- Database and upload backup/restore strategy is documented and tested.

Then verify the manual flow:

1. Login as your platform admin (created via `npm run create-admin`) and verify `/admin/firms`.
2. Login as `demo@tvacollect.com` (after running the demo seed, see "Demo Login" above).
3. Create or import clients.
4. Create a TVA collection and copy one public upload link.
5. Upload files from `/upload/[token]`.
6. Review/classify documents.
7. Open `/app/tva-readiness`, add TVA amount entries, and verify readiness.
8. Create a filing case from `/app/tva-filing`.
9. Export TVA entries and collection reports.
10. Check `/admin/release-checklist`.
