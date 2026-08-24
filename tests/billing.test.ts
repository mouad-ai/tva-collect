import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { FirmStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { BILLING_SUSPENSION_DAYS, overLimitReasons, usagePercent, writeAccessDenial } from "../lib/billing";
import {
  extractLemonWebhookContext,
  mapLemonStatusToSubscriptionStatus,
  mapSubscriptionStatusToFirmStatus,
  verifyLemonSqueezySignature
} from "../lib/lemonsqueezy";

test("usagePercent caps at 100 and handles unlimited plans", () => {
  assert.equal(usagePercent(15, 30), 50);
  assert.equal(usagePercent(40, 30), 100);
  assert.equal(usagePercent(10, null), 0);
});

test("Lemon Squeezy webhook signature verification uses HMAC SHA256", () => {
  const rawBody = JSON.stringify({ data: { id: "sub_123" } });
  const secret = "test-webhook-secret";
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

  assert.equal(verifyLemonSqueezySignature(rawBody, signature, secret), true);
  assert.equal(verifyLemonSqueezySignature(rawBody, "bad-signature", secret), false);
  assert.equal(verifyLemonSqueezySignature(rawBody, signature, ""), false);
});

test("Lemon Squeezy statuses map to local subscription and firm access statuses", () => {
  assert.equal(mapLemonStatusToSubscriptionStatus("active"), SubscriptionStatus.ACTIVE);
  assert.equal(mapLemonStatusToSubscriptionStatus("on_trial"), SubscriptionStatus.TRIAL);
  assert.equal(mapLemonStatusToSubscriptionStatus("past_due"), SubscriptionStatus.OVERDUE);
  assert.equal(mapLemonStatusToSubscriptionStatus("unpaid"), SubscriptionStatus.SUSPENDED);
  assert.equal(mapLemonStatusToSubscriptionStatus("cancelled"), SubscriptionStatus.CANCELLED_BUT_ACTIVE);
  assert.equal(mapLemonStatusToSubscriptionStatus("expired"), SubscriptionStatus.SUSPENDED);
  assert.equal(mapLemonStatusToSubscriptionStatus("paused"), SubscriptionStatus.SUSPENDED);
  assert.equal(mapLemonStatusToSubscriptionStatus("resumed"), SubscriptionStatus.ACTIVE);

  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.ACTIVE), FirmStatus.ACTIVE);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.TRIAL), FirmStatus.TRIAL);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.OVERDUE), FirmStatus.OVERDUE);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.SUSPENDED), FirmStatus.SUSPENDED);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.CANCELLED_BUT_ACTIVE), FirmStatus.ACTIVE);
});

test("Lemon Squeezy payment/invoice events resolve the parent subscription ID differently than lifecycle events", () => {
  // Lifecycle event: `data` IS the subscription resource, so data.id is the subscription ID.
  const lifecyclePayload = {
    meta: { event_name: "subscription_updated", event_id: "evt_1" },
    data: { id: "sub_lifecycle_id", attributes: { status: "active" } }
  };
  assert.equal(extractLemonWebhookContext(lifecyclePayload).lemonSubscriptionId, "sub_lifecycle_id");

  // Payment/invoice event: `data` is a subscription-invoice resource — data.id
  // is the INVOICE's own ID, and the real subscription ID only lives in
  // attributes.subscription_id. Regression test for a bug where this used to
  // read data.id here too and would misattribute the payment to the wrong
  // (or a nonexistent) subscription.
  const paymentPayload = {
    meta: { event_name: "subscription_payment_failed", event_id: "evt_2" },
    data: { id: "invoice_id_not_a_subscription", attributes: { subscription_id: "sub_payment_parent_id", status: "past_due" } }
  };
  assert.equal(extractLemonWebhookContext(paymentPayload).lemonSubscriptionId, "sub_payment_parent_id");
});

test("overLimitReasons flags a firm above its plan limits without ever suggesting deletion", () => {
  const plan = { clientLimit: 20, userLimit: 1, activeCollectionLimit: 1, storageLimitMb: 2048 } as SubscriptionPlan;

  assert.deepEqual(overLimitReasons(plan, { clients: 10, users: 1, activeCollections: 1, storageBytes: 0, files: 0 }), []);

  const overUsage = { clients: 25, users: 3, activeCollections: 1, storageBytes: 0, files: 0 };
  const reasons = overLimitReasons(plan, overUsage);
  assert.equal(reasons.length, 2);
  assert.match(reasons[0], /Clients : 25 \/ 20/);
  assert.match(reasons[1], /Utilisateurs : 3 \/ 1/);

  assert.deepEqual(overLimitReasons(null, overUsage), []);
});

test("Lemon Squeezy webhook context extracts firm, plan, subscription, portal, and card fields", () => {
  const payload = {
    meta: {
      event_name: "subscription_created",
      event_id: "evt_123",
      custom_data: {
        firmId: "firm_123",
        userId: "user_123",
        planCode: "pro"
      }
    },
    data: {
      id: "sub_123",
      attributes: {
        status: "active",
        customer_id: 77,
        order_id: 88,
        product_id: 99,
        variant_id: 100,
        first_subscription_item: { id: "item_123" },
        renews_at: "2026-08-01T00:00:00.000Z",
        card_brand: "visa",
        card_last_four: "4242",
        urls: {
          customer_portal: "https://billing.example/portal",
          update_payment_method: "https://billing.example/payment"
        }
      }
    }
  };

  const context = extractLemonWebhookContext(payload);

  assert.equal(context.eventName, "subscription_created");
  assert.equal(context.eventId, "evt_123");
  assert.equal(context.firmId, "firm_123");
  assert.equal(context.userId, "user_123");
  assert.equal(context.planCode, "PRO");
  assert.equal(context.lemonSubscriptionId, "sub_123");
  assert.equal(context.lemonSubscriptionItemId, "item_123");
  assert.equal(context.customerPortalUrl, "https://billing.example/portal");
  assert.equal(context.updatePaymentMethodUrl, "https://billing.example/payment");
  assert.equal(context.cardBrand, "visa");
  assert.equal(context.cardLastFour, "4242");
  assert.equal(context.renewsAt?.toISOString(), "2026-08-01T00:00:00.000Z");
});

// --- Trial expiry enforcement -------------------------------------------
// Regression guard for a real revenue leak: an expired free trial landed in
// OVERDUE, which requireActiveSubscription allowed, and nothing except a
// manual admin suspension ever moved a firm to SUSPENDED. Result: 30-day
// trial, then full write access forever, for free.

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-01T12:00:00.000Z");
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY);

test("expired trial that never paid loses write access", () => {
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.OVERDUE,
    everPaid: false,
    trialEndsAt: daysFromNow(-1),
    currentPeriodEnd: daysFromNow(-1),
    now: NOW
  });
  assert.equal(denial?.code, "TRIAL_EXPIRED");
});

test("trial still running keeps write access", () => {
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.TRIAL,
    everPaid: false,
    trialEndsAt: daysFromNow(5),
    currentPeriodEnd: daysFromNow(5),
    now: NOW
  });
  assert.equal(denial, null);
});

test("paying customer with a failed payment keeps working during the grace window", () => {
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.OVERDUE,
    everPaid: true,
    trialEndsAt: daysFromNow(-90),
    currentPeriodEnd: daysFromNow(-3),
    now: NOW
  });
  assert.equal(denial, null, "a real customer must not be cut off 3 days after a failed charge");
});

test("paying customer loses write access once the grace window elapses", () => {
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.OVERDUE,
    everPaid: true,
    trialEndsAt: daysFromNow(-90),
    currentPeriodEnd: daysFromNow(-(BILLING_SUSPENSION_DAYS + 1)),
    now: NOW
  });
  assert.equal(denial?.code, "PAYMENT_OVERDUE");
});

test("an explicitly ACTIVE subscription is never blocked, even past its trial date", () => {
  // Covers firms an admin activated by hand on the manual bank-transfer flow,
  // which have no Lemon Squeezy subscription id and may have no PAID invoice
  // recorded yet.
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    everPaid: false,
    trialEndsAt: daysFromNow(-365),
    currentPeriodEnd: daysFromNow(-365),
    now: NOW
  });
  assert.equal(denial, null);
});

test("a firm with no trial end date recorded is not blocked", () => {
  const denial = writeAccessDenial({
    subscriptionStatus: SubscriptionStatus.TRIAL,
    everPaid: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    now: NOW
  });
  assert.equal(denial, null);
});
