import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { FirmStatus, SubscriptionStatus } from "@prisma/client";
import { usagePercent } from "../lib/billing";
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

  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.ACTIVE), FirmStatus.ACTIVE);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.TRIAL), FirmStatus.TRIAL);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.OVERDUE), FirmStatus.OVERDUE);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.SUSPENDED), FirmStatus.SUSPENDED);
  assert.equal(mapSubscriptionStatusToFirmStatus(SubscriptionStatus.CANCELLED_BUT_ACTIVE), FirmStatus.ACTIVE);
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
