ALTER TABLE "Firm"
  DROP COLUMN IF EXISTS "plan",
  DROP COLUMN IF EXISTS "subscriptionStatus",
  DROP COLUMN IF EXISTS "billingStartDate",
  DROP COLUMN IF EXISTS "billingEndDate",
  DROP COLUMN IF EXISTS "monthlyPrice",
  DROP COLUMN IF EXISTS "paymentStatus",
  DROP COLUMN IF EXISTS "internalBillingNotes",
  DROP COLUMN IF EXISTS "customClientLimit",
  DROP COLUMN IF EXISTS "customUserLimit",
  DROP COLUMN IF EXISTS "customActiveCollectionLimit";

DROP TYPE IF EXISTS "SubscriptionPlan";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "PaymentStatus";
