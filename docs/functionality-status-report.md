# TVA Collect Functionality Status Report

Date: 2026-06-30

This report records the local verification pass for the current TVA Collect codebase. It separates features that were executed successfully from features that compile and route correctly but still require real production infrastructure or deeper end-to-end testing.

## Verification Commands

| Check | Result | Evidence |
| --- | --- | --- |
| Prisma schema validation | PASS | `npm run release:check` |
| ESLint | PASS | `npm run lint` and `npm run release:check` |
| Production build | PASS | `npm run release:check` generated all 50 app routes |
| Test suite | PASS | `npm test` passed 12/12 tests |
| Database migration status | PASS | `npx prisma migrate status` reported 21 migrations and schema up to date |
| Functional smoke test | PASS | `npm run smoke:functional` passed all checks |
| Docker production config | PASS | `docker compose --env-file .env.production -f docker-compose.prod.yml config` validated previously |

## Functional Smoke Coverage

The smoke test logs in as both SaaS admin and cabinet owner, checks core pages, executes API flows, uploads a document through a public upload token, and removes its temporary smoke data afterward.

| Area | Status | What Was Checked |
| --- | --- | --- |
| Health endpoint | Working | `/api/health` returns HTTP 200 with database status |
| Admin login redirect | Working | Admin login redirects to `/admin` |
| Cabinet login redirect | Working | Owner login redirects to `/app` |
| Public pages | Working | `/`, `/pricing`, `/contact`, `/demo`, `/privacy`, `/terms`, `/login`, `/forgot-password` |
| Admin pages | Working | `/admin`, firms, new firm, users, invites, events, leads, release checklist |
| App pages | Working | Dashboard, clients, collections, documents, reminders, reports, settings, team, billing, help, search, notifications, proof vault, trash, TVA/fiscal pages, work queue |
| Public upload page | Working | Valid active upload token renders `/upload/[token]` |
| Public upload API | Working | POST to `/api/public/upload/[token]` succeeds for active, unlocked collection |
| Client CRUD | Working | Create, update, and soft-delete client through API |
| Client import API | Working | Basic row import creates one client |
| Collection APIs | Working | List, detail, CSV export |
| Document APIs | Working | List, detail download |
| TVA entry export | Working | Client collection TVA CSV export |
| Reminder generation | Working | Reminder API generates a message |
| Contact/lead form | Working | Contact API creates lead and redirects with HTTP 303 |

## Security And Tenant Foundation

| Feature | Status | Evidence |
| --- | --- | --- |
| SaaS admin role | Working | Tests verify admin-only access and admin provisioning |
| Firm owner provisioning | Working | Tests verify admin can provision firm owner |
| Owner/manager team invites | Working | Tests verify owner/manager can invite team roles |
| Assistant invite blocking | Working | Tests verify assistant cannot invite users |
| Clients are not users | Working | Tests verify upload flow does not require user account |
| Tenant isolation | Working | Tests verify firm users cannot access another firm's resources |
| RBAC billing/admin separation | Working | Tests verify assistant/read-only restrictions and owner/manager billing access |
| Invite token reuse protection | Working | Tests verify expired and accepted invites fail |
| Password reset token reuse protection | Working | Tests verify expired/used reset tokens fail |
| Suspended/cancelled firm blocking | Working | Tests verify app operations and public uploads are blocked |
| Suspicious/quarantined downloads | Working | Tests verify blocked document download |

## Production And Deployment Readiness

| Feature | Status | Notes |
| --- | --- | --- |
| `.env.example` / deployment env docs | Present | Production variables documented in deployment files |
| Dockerfile | Present | Production image builds through release check path; full container runtime should be tested on VPS |
| Docker Compose production stack | Present | Includes app, PostgreSQL, Nginx, Certbot, and MinIO-style object storage configuration |
| Nginx config | Present | Needs real domain/VPS TLS test |
| Health endpoint | Working | Local HTTP check passed |
| Local upload storage | Working | Public upload smoke test passed |
| S3/MinIO storage abstraction | Present, needs provider test | Code path exists but was not tested against live MinIO/S3 credentials |
| SMTP email abstraction | Present, needs provider test | Dev logging exists; real SMTP delivery requires provider credentials |
| Backup strategy docs | Present | Operational restore still requires VPS execution/drill |

## Feature Domains

| Domain | Status | Notes |
| --- | --- | --- |
| Public marketing pages | Working | Routes build and smoke-pass |
| Authentication | Working | Login, logout, invite, and reset routes build; login redirects verified |
| Admin control area | Working route/API foundation | Pages route correctly; provisioning covered by tests |
| Cabinet dashboard | Working route | Route builds and loads; detailed KPI accuracy not deeply asserted |
| Clients | Working | CRUD, list route, detail route, import route, soft delete verified |
| Collections | Working | List/detail routes and export route verified |
| Public client upload | Working | Page and POST upload verified with active token |
| Documents | Working | List route and download API verified |
| Reminders | Working | Reminder generation API and page route verified |
| Search | Working route | Route loads; search UX should be manually checked with realistic records |
| Notifications | Working route | Route loads; unread clearing logic compiles, but browser UX should be clicked manually |
| Reports | Working route/API foundation | CSV exports verified; report content should be validated with real cabinet data |
| Settings | Working route | Firm/settings routes load; individual form branches need manual user acceptance testing |
| Billing | Working route | Manual billing UI route loads; no online payment gateway by design |
| Team management | Working route/test foundation | Invite permissions covered by tests |
| Trash/soft delete | Working foundation | Client soft delete verified; broader restore UX should be manually checked |
| TVA readiness/filing/risk/fiscal audit pages | Working routes | Pages build and load; fiscal calculations need accountant/domain validation |
| Proof vault | Working route | Route loads; export bundle completeness should be checked with real dossiers |
| Work queue | Working route | Route loads; prioritization should be validated against real workload expectations |
| Release checklist | Working route | Admin route loads |

## Known Limits And Ambiguous Areas

These are not blockers for demo/internal testing, but they should be handled before trusting the app with production client files.

| Area | Status | Risk |
| --- | --- | --- |
| Real SMTP delivery | Not fully verified | Needs SMTP provider credentials and a real email delivery test |
| Real MinIO/S3 upload/download | Not fully verified | Needs production object storage test with private files |
| Nginx + TLS + domain | Not fully verified | Needs VPS deployment and certificate issuance |
| Backup/restore | Documented only | Needs a real restore drill |
| Advanced Excel import mapping | Partial | Current import smoke verifies basic row import, not full messy Excel mapping |
| ZIP/proof bundle exports | Partial or route-dependent | CSV exports verified; large ZIP/background exports need implementation-specific testing |
| Background jobs | Not fully verified | No live queue worker verification in this local pass |
| Full UI filtering/pagination on every table | Partial | Routes compile and load; each table should be clicked manually for UX acceptance |
| Notification read/badge UX | Partial | Backend/page compile; browser interaction should be verified after opening notification center |
| French-only UI | Partial | Many labels were translated earlier, but full visual sweep should still be done |
| Fiscal/TVA legal correctness | Needs domain review | Code can build, but Moroccan TVA compliance logic should be reviewed by an accountant |
| Cross-browser/mobile upload UX | Not fully verified | Needs phone/browser tests |

## Recommended Next Gate Before Real Production

1. Run `npm run smoke:functional` after every significant change.
2. Deploy to a staging VPS using Docker Compose.
3. Configure real `APP_URL`, `AUTH_SECRET`, PostgreSQL, SMTP, and MinIO/S3 credentials.
4. Upload and download a real private test file through MinIO/S3.
5. Send a real invite email and password reset email.
6. Test `/upload/[token]` on a phone with slow network.
7. Run a backup and restore drill.
8. Manually click table filters, pagination, search, notifications, settings, team invites, billing, and admin firm lifecycle.

## Bottom Line

The current codebase passes local build, schema, migration, automated security tests, and a broad functional smoke test. It is suitable for demo/internal testing and a controlled staging pilot.

Do not treat it as fully production-proven until SMTP, MinIO/S3, Nginx/TLS, backup/restore, and real mobile upload behavior are tested on the actual VPS environment.
