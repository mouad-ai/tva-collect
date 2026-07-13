# Lemon Squeezy Integration

TVA Collect supports two billing providers side by side, distinguished by `FirmSubscription.provider`:

- **`MANUAL`** — bank transfer / cash / cheque, tracked via `BillingInvoice` + `PaymentProof` (see [billing-actions.ts](../app/billing-actions.ts)). This is the default for any firm bootstrapped without going through online checkout.
- **`LEMON_SQUEEZY`** — online card subscription, created by hosted checkout and kept in sync by webhooks.

The two never mix: a firm's `FirmSubscription.provider` is only ever set to `"LEMON_SQUEEZY"` by the webhook processor (`lib/lemonsqueezy.ts`) when that firm actually completes an LS checkout. Manual billing actions never touch a `LEMON_SQUEEZY`-provider firm's plan/status, and LS payment webhooks never touch a `MANUAL`-provider firm.

## 1. Lemon Squeezy store setup

1. In the Lemon Squeezy dashboard, create (or confirm) your **Store**. Note the **Store ID** (Settings → General).
2. Create one **Product** per TVA Collect plan tier: Essentiel (Starter), Professionnel (Pro), Cabinet Plus (Premium).
3. For each product, create **two Variants**: Monthly and Yearly (with your yearly discount applied).
4. For each variant, find its **Variant ID**: open the variant in the dashboard, the ID is in the URL (`.../variants/{id}`) or via the API (`GET /v1/variants`).
5. Generate an **API Key** (Settings → API) with subscription/checkout scopes.
6. Note your **Webhook Signing Secret** — you'll set this when creating the webhook in step 4 below.

## 2. Required environment variables

These are the **actual names already implemented and deployed** — do not invent alternatives. Set them in `.env.production` (see [deploy/.env.production.example](../deploy/.env.production.example)):

```bash
BILLING_PROVIDER=LEMON_SQUEEZY

LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...

# One monthly + one yearly variant ID per plan. A plan with no variant ID
# configured simply won't show that checkout button (see CheckoutButton usage
# in app/app/billing/page.tsx) — it fails safe, not broken.
LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID=...
LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID=...
LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID=...
LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID=...
LEMONSQUEEZY_PREMIUM_MONTHLY_VARIANT_ID=...
LEMONSQUEEZY_PREMIUM_YEARLY_VARIANT_ID=...

# Already required elsewhere in the app; also used to build checkout
# success/cancel redirect URLs (lib/lemonsqueezy.ts) and portal links.
APP_URL=https://app.tvacollect.com
PUBLIC_SITE_URL=https://tvacollect.com
```

Why monthly/yearly per plan instead of one variant per plan: Lemon Squeezy models different billing intervals as separate variants of the same product, and TVA Collect's pricing page offers both — collapsing this to one variant per plan would remove yearly billing entirely. The lookup helper is `lemonVariantEnvName(planCode, interval)` in [lib/lemonsqueezy.ts](../lib/lemonsqueezy.ts).

Plan codes in the database are `STARTER`, `PRO`, `PREMIUM` (marketed as Essentiel/Professionnel/Cabinet Plus). There is no separate "Business" plan — Premium/Cabinet Plus fills that role.

## 3. Webhook setup

In the Lemon Squeezy dashboard → Settings → Webhooks:

- **URL:** `https://app.tvacollect.com/api/webhooks/lemonsqueezy`
- **Signing secret:** must exactly match `LEMONSQUEEZY_WEBHOOK_SECRET`.
- **Events to enable:**
  - `subscription_created`
  - `subscription_updated`
  - `subscription_cancelled`
  - `subscription_resumed`
  - `subscription_expired`
  - `subscription_paused`
  - `subscription_unpaused`
  - `subscription_payment_success`
  - `subscription_payment_failed`
  - `subscription_payment_recovered`
  - `subscription_payment_refunded`

The webhook route ([app/api/webhooks/lemonsqueezy/route.ts](../app/api/webhooks/lemonsqueezy/route.ts)) verifies the `X-Signature` header with a timing-safe HMAC-SHA256 comparison (`verifyLemonSqueezySignature`) before touching the payload — invalid signatures get a `401` and are never processed.

### How events are handled

- **Subscription lifecycle events** (`subscription_created/updated/cancelled/resumed/expired/paused/unpaused`) run the full sync: resolve the TVA Collect plan from the variant ID, map the Lemon status to `SubscriptionStatus`, upsert `FirmSubscription`, and update `Firm.status`/`Firm.plan` accordingly.
- **Payment events** (`subscription_payment_success/failed/recovered/refunded`) are a *different Lemon Squeezy resource* (a subscription-invoice, not the subscription itself) and are handled separately — they only nudge `SubscriptionStatus`/`FirmStatus` toward `OVERDUE` (on failure) or back to `ACTIVE` (on recovery, and only if the firm was `OVERDUE`), and never touch plan/variant/period data. `refunded` is logged only — refunds are reviewed manually.
- **Idempotency:** every webhook is recorded in `BillingEvent` keyed by `externalEventId` (Lemon's event ID) before processing starts. A duplicate delivery of an already-`processedAt` event is a no-op.
- **Status mapping** (`FirmStatus`):
  - `active` / `on_trial` → firm `ACTIVE` / `TRIAL`
  - `past_due` → firm `OVERDUE` (grace period — the firm is not suspended)
  - `unpaid` / `expired` / `paused` → firm `SUSPENDED`
  - `cancelled` → firm stays `ACTIVE` until the paid period actually ends (`CANCELLED_BUT_ACTIVE`), matching Lemon Squeezy's own behavior of granting access through the end of the paid term.

## 4. Customer portal

Lemon Squeezy doesn't have a separate "create portal session" API the way some other providers do — the portal URL comes from the subscription resource itself and can go stale between webhook events. `POST /api/billing/lemonsqueezy/customer-portal` (authenticated, OWNER/MANAGER only) re-fetches `GET /v1/subscriptions/{id}` on demand and returns a fresh URL, used by the "Gérer l'abonnement" button on `/app/billing`. It only works for firms with `provider === "LEMON_SQUEEZY"` and a stored `lemonSubscriptionId` — manually-billed firms see a different message instead.

## 5. Local / test-mode testing

1. Switch your Lemon Squeezy store to **Test mode** (toggle in the dashboard). Test-mode API keys, variant IDs, and webhook secrets are separate from live ones — use a `.env.local` (or a separate `.env.test`) with the test values so you never accidentally hit production Lemon Squeezy data.
2. No real card is required in test mode — Lemon Squeezy provides test card numbers in their checkout docs.
3. To receive webhooks locally, expose your dev server with a tunnel (e.g. `ngrok http 3000`) and register the tunnel URL + `/api/webhooks/lemonsqueezy` as a **test-mode** webhook endpoint in the dashboard.
4. Trigger a full cycle: create a checkout for a plan → complete it with a test card → confirm the `subscription_created` webhook arrives and `FirmSubscription`/`Firm` update → open `/admin/billing-events` to see the raw payload and processing status.
5. Lemon Squeezy's dashboard lets you resend any webhook event manually — use this to test idempotency (resend the same event twice, confirm no double-processing) and to test payment-failure handling without waiting for a real card to actually fail.

## 6. Production deployment checklist

- [ ] Store is switched to **Live mode**; all env vars point to live keys/variant IDs (not test-mode values).
- [ ] Webhook endpoint registered in live mode pointing at `https://app.tvacollect.com/api/webhooks/lemonsqueezy` with the correct live signing secret in `LEMONSQUEEZY_WEBHOOK_SECRET`.
- [ ] All 11 events listed in §3 are enabled on the live webhook.
- [ ] `APP_URL` and `PUBLIC_SITE_URL` are the real production domains (checkout success/cancel redirects and portal links are built from these).
- [ ] Run through the manual test checklist below against the live store with a real low-value test purchase (or Lemon Squeezy's live-mode test card if your account has one), then refund/cancel it.
- [ ] Confirm `/admin/subscriptions` and `/admin/billing-events` are reachable and show the test transaction.
- [ ] Confirm a firm that has never touched Lemon Squeezy still shows `provider: MANUAL` and is unaffected.

## 7. Rollback plan

Lemon Squeezy billing is additive — it does not replace or require removing manual billing. If something goes wrong after deploying:

1. **Webhook misbehaving / corrupting data:** disable the webhook endpoint in the Lemon Squeezy dashboard (Settings → Webhooks → toggle off) immediately. No new events will arrive; existing `FirmSubscription`/`Firm` rows are unaffected until you re-enable it. Fix the code, redeploy, re-enable.
2. **Checkout button causing errors:** the checkout/portal buttons fail closed — if `LEMONSQUEEZY_API_KEY`/variant env vars are unset, `CheckoutButton` simply doesn't render for that plan (see `app/app/billing/page.tsx`), and the checkout route returns a clean `503` rather than crashing. To fully hide online checkout, unset the plan's variant env vars, or set `BILLING_PROVIDER` back to manual-only in your deployment config and hide the checkout section (single conditional in `app/app/billing/page.tsx`).
3. **A specific firm's subscription state is wrong:** admins can correct the *local* plan mapping from `/admin/firms/[id]/billing` → "Plan local" (this does not talk to Lemon Squeezy, it only fixes TVA Collect's own record) while the underlying Lemon Squeezy subscription is fixed via their dashboard or support.
4. **Full incident:** the raw webhook payload for every event is stored in `BillingEvent.payload` — nothing is lost, so any bad sync can be replayed/recomputed after a fix by resending the event from the Lemon Squeezy dashboard.

## 8. Error handling reference

| Situation | Behavior |
|---|---|
| Missing `LEMONSQUEEZY_API_KEY`/`LEMONSQUEEZY_STORE_ID` | Checkout/portal routes return `503` with a reference ID; no secret is ever included in the response or logs. |
| Invalid/missing plan code | Checkout route returns `400 Plan invalide.` |
| Plan has no variant configured for the requested interval | Checkout route returns `400`; the button for that interval simply doesn't render in the UI. |
| Lemon Squeezy API error (checkout creation, portal fetch) | `502` with a reference ID; full error logged server-side via `logServerError` (never exposed to the client). |
| Invalid webhook signature | `401`, event is not persisted, failure is logged server-side without the raw body/signature. |
| Invalid webhook JSON | `400`. |
| Webhook processing error (e.g. unmapped variant) | Event is already durably saved to `BillingEvent` with `processingError` set before the route returns `500` (so Lemon Squeezy retries); check `/admin/billing-events` to diagnose. |
| Customer portal requested for a firm with no Lemon Squeezy subscription | `404` with a clear message distinguishing "no subscription" from a technical error. |
