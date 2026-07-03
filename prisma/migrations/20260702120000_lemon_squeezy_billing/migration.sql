ALTER TYPE "FirmStatus" ADD VALUE IF NOT EXISTS 'CANCELLED_BUT_ACTIVE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'UNPAID';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED_BUT_ACTIVE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "monthlyPriceUsd" INTEGER,
  ADD COLUMN IF NOT EXISTS "yearlyPriceUsd" INTEGER,
  ADD COLUMN IF NOT EXISTS "lemonMonthlyVariantId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonYearlyVariantId" TEXT;

ALTER TABLE "FirmSubscription"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'LEMON_SQUEEZY',
  ADD COLUMN IF NOT EXISTS "lemonCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonVariantId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonSubscriptionItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "lemonStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "renewsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cardBrand" TEXT,
  ADD COLUMN IF NOT EXISTS "cardLastFour" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPortalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "updatePaymentMethodUrl" TEXT;

WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "firmId" ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC) AS rn
  FROM "FirmSubscription"
)
DELETE FROM "FirmSubscription"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "FirmSubscription_firmId_key" ON "FirmSubscription"("firmId");
CREATE UNIQUE INDEX IF NOT EXISTS "FirmSubscription_lemonSubscriptionId_key" ON "FirmSubscription"("lemonSubscriptionId");
CREATE INDEX IF NOT EXISTS "FirmSubscription_lemonVariantId_idx" ON "FirmSubscription"("lemonVariantId");

CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'LEMON_SQUEEZY',
  "eventName" TEXT NOT NULL,
  "externalEventId" TEXT,
  "firmId" TEXT,
  "subscriptionId" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "processingError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingEvent_externalEventId_key" ON "BillingEvent"("externalEventId");
CREATE INDEX IF NOT EXISTS "BillingEvent_firmId_idx" ON "BillingEvent"("firmId");
CREATE INDEX IF NOT EXISTS "BillingEvent_subscriptionId_idx" ON "BillingEvent"("subscriptionId");
CREATE INDEX IF NOT EXISTS "BillingEvent_eventName_idx" ON "BillingEvent"("eventName");
CREATE INDEX IF NOT EXISTS "BillingEvent_createdAt_idx" ON "BillingEvent"("createdAt");
