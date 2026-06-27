CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'CUSTOM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'PILOT', 'ACTIVE', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

ALTER TABLE "Firm"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "billingStartDate" TIMESTAMP(3),
  ADD COLUMN "billingEndDate" TIMESTAMP(3),
  ADD COLUMN "monthlyPrice" INTEGER,
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "internalBillingNotes" TEXT,
  ADD COLUMN "customClientLimit" INTEGER,
  ADD COLUMN "customUserLimit" INTEGER,
  ADD COLUMN "customActiveCollectionLimit" INTEGER;
