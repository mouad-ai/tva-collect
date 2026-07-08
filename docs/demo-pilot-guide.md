# Demo & Pilot Guide

How to seed realistic demo data and run a clean 10-minute product demo for a Moroccan accounting firm (cabinet comptable).

## 1. Seed the demo data

The demo seed lives at `prisma/seed.ts`. It is safe to re-run: it only touches its own demo firms (matched by the fixed demo emails below) and demo leads — it never deletes any other data.

```bash
ALLOW_DEMO_SEED=true DEMO_PASSWORD='Choose-A-Strong-One-1!' npx prisma db seed
```

Requirements:
- `DEMO_PASSWORD` must be at least 12 characters with upper/lower case, a digit, and a special character. It is never hardcoded — you choose it each time.
- If your environment has `NODE_ENV=production` (a real demo/pilot server configured like production), also set `CONFIRM_PRODUCTION_SEED=true`.
- A platform **admin** account is not created by this script — create/verify one separately with the existing safe script:
  ```bash
  ADMIN_NAME="Your Name" ADMIN_EMAIL="you@yourcompany.com" ADMIN_PASSWORD='...' npm run create-admin
  ```

### What gets created
- **Fiduciaire Atlas Conseil** — the main demo cabinet, `ACTIVE` / `PRO` plan.
  - Owner: `demo@tvacollect.com`
  - Assistant: `assistant-demo@tvacollect.com`
  - One pending (not yet accepted) invite for a Manager role, to demo the invite flow.
  - 8 fictional clients across several Moroccan cities, with valid-format mobile numbers (so the WhatsApp reminder button works in the demo).
  - Current month: an **ACTIVE** collection period with a deliberately varied mix — complete dossiers, missing documents, a document pending review, an active rejection, a rejection that was corrected and re-validated, and reminder history (WhatsApp + email).
  - Previous month: a **CLOSED** collection period, fully validated — shows the product already completed one full cycle.
  - Proof Vault / audit history populated for the interesting clients.
- **Cabinet Zniber Conseil** — a second, `TRIAL`-status firm with just an owner and no data yet (`essai@tvacollect.com`), for admin-list variety (shows both an active paying cabinet and a fresh signup).
- 3 demo leads in different pipeline stages, for the admin leads view.

### Resetting the demo
Re-run the same command. It removes the previous demo firms (cascades their clients/collections/documents/reminders/invites) and demo leads, then recreates everything fresh.

## 2. Demo credentials

| Role | Email | Password |
|---|---|---|
| Cabinet owner (main demo account) | `demo@tvacollect.com` | the `DEMO_PASSWORD` you set when seeding |
| Cabinet assistant | `assistant-demo@tvacollect.com` | same |
| Trial cabinet owner (admin-list variety only) | `essai@tvacollect.com` | same |
| Platform admin | whatever you set via `npm run create-admin` | — |

Do not reuse the demo password for anything real. It exists only in whatever secret store you use to run the seed command (shell history, CI secret, password manager) — never commit it.

## 3. URLs to open

| Purpose | URL |
|---|---|
| Public marketing site | `https://<your-domain>/` |
| Cabinet login | `https://app.<your-domain>/login` |
| Cabinet dashboard | `https://app.<your-domain>/app` |
| Admin login/dashboard | `https://admin.<your-domain>/admin` |
| Client upload page (get the real link from the seeded collection) | `https://<your-domain>/upload/<token>` |

Locally: `http://localhost:3000/login`, `http://localhost:3000/app`, `http://localhost:3000/admin`.

## 4. The 10-minute demo flow

Follow this order — it tells a story (chaos → control → proof), not just a feature tour.

1. **(0:00–1:00) Landing page.** Open `/`. Point out the hero line — "Collectez les documents TVA de vos clients sans chaos WhatsApp." Scroll to the workflow section (create → send link → receive → verify → relaunch).
2. **(1:00–1:30) Login.** Click "Connexion" → lands directly on `app.<domain>/login` (one hop, no double login). Log in as `demo@tvacollect.com`.
3. **(1:30–3:00) Dashboard.** This is the payoff screen. Point out: KPI cards, "Brief du matin" critical notes, "Actions du jour", the risk table (Café Renaissance / École Les Orangers should show up as needing attention), the onboarding checklist if any step is still open (it won't be, on the seeded account — mention it's what a *new* cabinet sees on day one).
4. **(3:00–4:00) Clients.** Open a client with a rejected document (Garage Meknassi). Show the client list, then open the client to show its dossier.
5. **(4:00–5:30) Collection detail.** Open the active collection period. Point out per-client status, the risk column, and the reminder buttons. Click "Envoyer via WhatsApp" for a client with a phone — show it opens WhatsApp with the message pre-filled (or copies as fallback if WhatsApp isn't installed on the demo machine).
6. **(5:30–7:00) The client side.** Open the client upload link for École Les Orangers (nothing uploaded yet) in a new tab/phone. Show how simple it is — no account, clear list of requested documents, upload a file live for a real moment. Then open Garage Meknassi's link to show a **rejected** document with the reason visible and the "upload a replacement" flow.
7. **(7:00–8:00) Document review.** Back in the cabinet view, open Documents, show validating/rejecting a document with a comment, and mention the client sees this automatically (email if they have one on file).
8. **(8:00–9:00) Proof Vault.** Open Proof Vault for one of the more active demo clients — show the full audit trail (link opened, document uploaded, reviewed, reminder sent). This is a trust/differentiation moment — "you have proof of every action, not just the final file."
9. **(9:00–10:00) Admin view (optional, if demoing to an internal stakeholder or investor rather than the cabinet itself).** Switch to the admin login. Show `/admin/firms` (both demo cabinets), `/admin/leads` (the pipeline), and a firm detail page.

## 5. Things to avoid mentioning (not demo-ready yet)

Be upfront if asked directly, but don't proactively lead with these:

- **Automatic/scheduled reminders.** Reminders are one-click-assisted (WhatsApp deep link, real email send) but still require a human to click — there is no cron job that reminds clients on its own yet.
- **Online card payment (Lemon Squeezy).** It bills in USD, not MAD, which is a poor fit for a Moroccan cabinet paying by card. If billing comes up, describe the **manual bank-transfer + payment-proof** flow instead — that part is real and already built.
- **ZIP/bundle export.** CSV export works; large ZIP exports of a full dossier are partial/unverified.
- **Real email/SMS delivery in this specific environment**, unless you've already configured `EMAIL_PROVIDER=resend` (or SMTP) and sent a real test email. In `console` mode, "sent" emails only appear in server logs — don't demo the reminder-email button as if the prospect's own inbox will receive something unless you've verified real delivery first.
- **Legal pages.** They're clearly marked as drafts pending legal review — don't present them as final if asked.
- **Fiscal/TVA calculation correctness** (TVA readiness, risk register, filing pages) — these are process/tracking tools, not verified fiscal advice. Don't claim they replace the accountant's own judgment.
- **Malware scanning on uploaded files** — treat this as "coming soon" rather than an active guarantee unless you've confirmed a real scanner is wired up in that environment.

## 6. Quick pre-demo checklist

- [ ] Seed ran successfully today (or recently) against the environment you're about to demo on.
- [ ] You can log in as `demo@tvacollect.com` right now.
- [ ] The dashboard shows the varied data described above (not an empty firm).
- [ ] You have the exact `/upload/<token>` link for at least one client open/bookmarked (copy it from the collection detail page beforehand — don't hunt for it live).
- [ ] Your own phone has WhatsApp installed if you plan to click the WhatsApp reminder button live.
- [ ] You know which environment you're on (don't accidentally demo against a real pilot cabinet's data).
