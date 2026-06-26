# TVA Collect

TVA Collect is a focused B2B SaaS MVP for Moroccan accounting firms. It helps a cabinet collect monthly TVA documents from clients through secure upload links, track missing documents, copy reminder messages, and export collection status.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Simple signed-cookie credentials auth
- Local file storage abstraction for MVP uploads

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

4. Run migrations and seed demo data:

```bash
npx prisma migrate dev
npx prisma db seed
```

5. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Demo Login

- Email: `demo@tvacollect.ma`
- Password: `password123`

## Main Routes

- `/` landing page
- `/pricing` pricing page
- `/contact` lead capture
- `/login` cabinet login
- `/app` dashboard
- `/app/clients` clients
- `/app/collections` collection periods
- `/app/documents` uploaded documents
- `/app/settings` firm settings
- `/upload/[token]` public client upload page

## Completed MVP Features

- Demo accountant login with hashed password
- Firm-scoped clients CRUD
- Monthly TVA collection periods
- Add clients to collection periods
- Secure random upload token per client collection
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
- S3/MinIO production storage
- ZIP download of all files
- Complex team roles
- Client account portal

## Known Limitations

- Uploads are stored locally under `uploads/`.
- Reminder messages are copied manually; no real notification is sent.
- The upload token does not expire yet.
- There is no ZIP export in this MVP.
- The status logic is intentionally simple and document-level classification is manual.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npx prisma migrate dev
npx prisma db seed
docker compose up -d
```
