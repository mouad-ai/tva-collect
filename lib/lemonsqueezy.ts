import { createHmac, timingSafeEqual } from "crypto";
import { FirmStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BillingInterval = "monthly" | "yearly";

export class LemonSqueezyConfigError extends Error {}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new LemonSqueezyConfigError(`${name} is required for Lemon Squeezy billing.`);
  return value;
}

function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function lemonVariantEnvName(planCode: string, interval: BillingInterval) {
  return `LEMONSQUEEZY_${planCode.toUpperCase()}_${interval.toUpperCase()}_VARIANT_ID`;
}

export function lemonVariantIdForPlan(planCode: string, interval: BillingInterval) {
  return optionalEnv(lemonVariantEnvName(planCode, interval));
}

export function verifyLemonSqueezySignature(rawBody: string, signature: string | null, secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "") {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mapLemonStatusToSubscriptionStatus(status?: string | null): SubscriptionStatus {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "on_trial") return SubscriptionStatus.TRIAL;
  if (normalized === "active" || normalized === "resumed") return SubscriptionStatus.ACTIVE;
  if (normalized === "past_due") return SubscriptionStatus.OVERDUE;
  if (normalized === "unpaid") return SubscriptionStatus.SUSPENDED;
  if (normalized === "cancelled") return SubscriptionStatus.CANCELLED_BUT_ACTIVE;
  if (normalized === "expired") return SubscriptionStatus.SUSPENDED;
  if (normalized === "paused") return SubscriptionStatus.SUSPENDED;
  return SubscriptionStatus.OVERDUE;
}

export function mapSubscriptionStatusToFirmStatus(status: SubscriptionStatus): FirmStatus {
  if (status === SubscriptionStatus.TRIAL || status === SubscriptionStatus.TRIALING) return FirmStatus.TRIAL;
  if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.CANCELLED_BUT_ACTIVE) return FirmStatus.ACTIVE;
  if (status === SubscriptionStatus.OVERDUE || status === SubscriptionStatus.PAST_DUE) return FirmStatus.OVERDUE;
  if (status === SubscriptionStatus.SUSPENDED || status === SubscriptionStatus.UNPAID || status === SubscriptionStatus.EXPIRED) return FirmStatus.SUSPENDED;
  return FirmStatus.CANCELLED;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringValue(value: unknown) {
  if (value == null) return null;
  return String(value);
}

function checkoutBaseUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function createLemonSqueezyCheckout(input: {
  firmId: string;
  userId: string;
  planCode: string;
  interval: BillingInterval;
}) {
  const apiKey = requiredEnv("LEMONSQUEEZY_API_KEY");
  const storeId = requiredEnv("LEMONSQUEEZY_STORE_ID");
  const variantId = lemonVariantIdForPlan(input.planCode, input.interval);
  if (!variantId) throw new LemonSqueezyConfigError(`${lemonVariantEnvName(input.planCode, input.interval)} is not configured.`);

  const baseUrl = checkoutBaseUrl();
  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/vnd.api+json"
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              firmId: input.firmId,
              userId: input.userId,
              planCode: input.planCode
            }
          },
          product_options: {
            redirect_url: `${baseUrl}/app/billing?checkout=success`,
            receipt_button_text: "Retour a TVA Collect",
            receipt_link_url: `${baseUrl}/app/billing?checkout=success`
          }
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } }
        }
      }
    })
  });

  const body = await response.json().catch(() => null) as { data?: { attributes?: { url?: string } }; errors?: unknown } | null;
  if (!response.ok || !body?.data?.attributes?.url) {
    throw new Error(`Lemon Squeezy checkout failed (${response.status}): ${JSON.stringify(body?.errors || body).slice(0, 500)}`);
  }
  return body.data.attributes.url;
}

export function extractLemonWebhookContext(payload: Record<string, unknown>) {
  const meta = (payload.meta || {}) as Record<string, unknown>;
  const data = (payload.data || {}) as Record<string, unknown>;
  const attributes = (data.attributes || {}) as Record<string, unknown>;
  const customData = (meta.custom_data || attributes.custom_data || {}) as Record<string, unknown>;
  const urls = (attributes.urls || {}) as Record<string, unknown>;
  const firstSubscriptionItem = (attributes.first_subscription_item || {}) as Record<string, unknown>;

  const eventName = stringValue(meta.event_name) || "unknown";
  const eventId = stringValue(meta.event_id) || stringValue(meta.webhook_id) || null;
  const lemonSubscriptionId = stringValue(data.id) || stringValue(attributes.subscription_id);
  const lemonVariantId = stringValue(attributes.variant_id);

  return {
    eventName,
    eventId,
    firmId: stringValue(customData.firmId),
    userId: stringValue(customData.userId),
    planCode: stringValue(customData.planCode)?.toUpperCase() || null,
    lemonSubscriptionId,
    lemonStatus: stringValue(attributes.status),
    lemonCustomerId: stringValue(attributes.customer_id),
    lemonOrderId: stringValue(attributes.order_id),
    lemonProductId: stringValue(attributes.product_id),
    lemonVariantId,
    lemonSubscriptionItemId: stringValue(firstSubscriptionItem.id) || stringValue(attributes.subscription_item_id),
    renewsAt: parseDate(attributes.renews_at),
    endsAt: parseDate(attributes.ends_at),
    trialEndsAt: parseDate(attributes.trial_ends_at),
    cardBrand: stringValue(attributes.card_brand),
    cardLastFour: stringValue(attributes.card_last_four),
    customerPortalUrl: stringValue(urls.customer_portal),
    updatePaymentMethodUrl: stringValue(urls.update_payment_method)
  };
}

async function planForWebhook(planCode: string | null, lemonVariantId: string | null) {
  if (lemonVariantId) {
    const byVariant = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { lemonMonthlyVariantId: lemonVariantId },
          { lemonYearlyVariantId: lemonVariantId }
        ],
        isActive: true
      }
    });
    if (byVariant) return byVariant;
  }
  if (planCode) return prisma.subscriptionPlan.findFirst({ where: { code: planCode, isActive: true } });
  return null;
}

export async function processLemonSqueezyWebhook(payload: Record<string, unknown>) {
  const context = extractLemonWebhookContext(payload);
  const existingEvent = context.eventId
    ? await prisma.billingEvent.findUnique({ where: { externalEventId: context.eventId } })
    : null;
  if (existingEvent?.processedAt) return { event: existingEvent, duplicate: true };

  const event = existingEvent || await prisma.billingEvent.create({
    data: {
      provider: "LEMON_SQUEEZY",
      eventName: context.eventName,
      externalEventId: context.eventId,
      firmId: context.firmId,
      subscriptionId: context.lemonSubscriptionId,
      payload: payload as Prisma.InputJsonValue
    }
  });

  try {
    const isSubscriptionEvent = context.eventName.startsWith("subscription_");
    if (isSubscriptionEvent && context.firmId) {
      const plan = await planForWebhook(context.planCode, context.lemonVariantId);
      if (!plan) throw new Error("No TVA Collect plan mapped to Lemon Squeezy variant.");
      const subscriptionStatus = mapLemonStatusToSubscriptionStatus(context.lemonStatus);
      const firmStatus = mapSubscriptionStatusToFirmStatus(subscriptionStatus);
      const now = new Date();

      const subscription = await prisma.firmSubscription.upsert({
        where: { firmId: context.firmId },
        update: {
          planId: plan.id,
          provider: "LEMON_SQUEEZY",
          lemonCustomerId: context.lemonCustomerId,
          lemonOrderId: context.lemonOrderId,
          lemonSubscriptionId: context.lemonSubscriptionId,
          lemonProductId: context.lemonProductId,
          lemonVariantId: context.lemonVariantId,
          lemonSubscriptionItemId: context.lemonSubscriptionItemId,
          lemonStatus: context.lemonStatus,
          status: subscriptionStatus,
          trialEndsAt: context.trialEndsAt,
          currentPeriodEnd: context.renewsAt || context.endsAt || now,
          renewsAt: context.renewsAt,
          endsAt: context.endsAt,
          cardBrand: context.cardBrand,
          cardLastFour: context.cardLastFour,
          customerPortalUrl: context.customerPortalUrl,
          updatePaymentMethodUrl: context.updatePaymentMethodUrl,
          cancelledAt: subscriptionStatus === SubscriptionStatus.CANCELLED || subscriptionStatus === SubscriptionStatus.CANCELLED_BUT_ACTIVE ? now : null,
          suspendedAt: subscriptionStatus === SubscriptionStatus.SUSPENDED ? now : null
        },
        create: {
          firmId: context.firmId,
          planId: plan.id,
          provider: "LEMON_SQUEEZY",
          lemonCustomerId: context.lemonCustomerId,
          lemonOrderId: context.lemonOrderId,
          lemonSubscriptionId: context.lemonSubscriptionId,
          lemonProductId: context.lemonProductId,
          lemonVariantId: context.lemonVariantId,
          lemonSubscriptionItemId: context.lemonSubscriptionItemId,
          lemonStatus: context.lemonStatus,
          status: subscriptionStatus,
          startedAt: now,
          trialEndsAt: context.trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: context.renewsAt || context.endsAt || now,
          renewsAt: context.renewsAt,
          endsAt: context.endsAt,
          cardBrand: context.cardBrand,
          cardLastFour: context.cardLastFour,
          customerPortalUrl: context.customerPortalUrl,
          updatePaymentMethodUrl: context.updatePaymentMethodUrl,
          cancelledAt: subscriptionStatus === SubscriptionStatus.CANCELLED || subscriptionStatus === SubscriptionStatus.CANCELLED_BUT_ACTIVE ? now : null,
          suspendedAt: subscriptionStatus === SubscriptionStatus.SUSPENDED ? now : null
        }
      });

      await prisma.firm.update({
        where: { id: context.firmId },
        data: {
          plan: plan.code,
          status: firmStatus,
          suspendedAt: firmStatus === FirmStatus.SUSPENDED ? now : null,
          suspendedReason: firmStatus === FirmStatus.SUSPENDED ? "Subscription Lemon Squeezy suspendu ou expire." : null,
          cancelledAt: firmStatus === FirmStatus.CANCELLED ? now : null
        }
      });
      await prisma.billingEvent.update({
        where: { id: event.id },
        data: { firmId: context.firmId, subscriptionId: subscription.id, processedAt: now, processingError: null }
      });
      return { event, subscription, duplicate: false };
    }

    await prisma.billingEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), processingError: null }
    });
    return { event, duplicate: false };
  } catch (error) {
    await prisma.billingEvent.update({
      where: { id: event.id },
      data: { processingError: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
}
