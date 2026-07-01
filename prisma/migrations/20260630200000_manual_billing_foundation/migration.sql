-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'UNPAID', 'PAYMENT_PROOF_SUBMITTED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPriceMad" INTEGER NOT NULL,
    "clientLimit" INTEGER,
    "userLimit" INTEGER,
    "storageLimitMb" INTEGER,
    "activeCollectionLimit" INTEGER,
    "hasZipExport" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedReports" BOOLEAN NOT NULL DEFAULT false,
    "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "hasWorkflowBuilder" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmSubscription" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "amountMad" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "BillingPaymentMethod",
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "originalFileName" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "amountMad" INTEGER,
    "method" "BillingPaymentMethod" NOT NULL,
    "reference" TEXT,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingReceipt" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amountMad" INTEGER NOT NULL,
    "paymentMethod" "BillingPaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformBillingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bankName" TEXT,
    "accountHolder" TEXT,
    "rib" TEXT,
    "iban" TEXT,
    "paymentInstructions" TEXT,
    "supportEmail" TEXT,
    "supportWhatsapp" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBillingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "FirmSubscription_firmId_idx" ON "FirmSubscription"("firmId");

-- CreateIndex
CREATE INDEX "FirmSubscription_firmId_status_idx" ON "FirmSubscription"("firmId", "status");

-- CreateIndex
CREATE INDEX "FirmSubscription_planId_idx" ON "FirmSubscription"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_invoiceNumber_key" ON "BillingInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingInvoice_firmId_status_idx" ON "BillingInvoice"("firmId", "status");

-- CreateIndex
CREATE INDEX "BillingInvoice_firmId_dueDate_idx" ON "BillingInvoice"("firmId", "dueDate");

-- CreateIndex
CREATE INDEX "BillingInvoice_subscriptionId_idx" ON "BillingInvoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentProof_firmId_idx" ON "PaymentProof"("firmId");

-- CreateIndex
CREATE INDEX "PaymentProof_invoiceId_idx" ON "PaymentProof"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentProof_firmId_status_idx" ON "PaymentProof"("firmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingReceipt_invoiceId_key" ON "BillingReceipt"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingReceipt_receiptNumber_key" ON "BillingReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "BillingReceipt_firmId_idx" ON "BillingReceipt"("firmId");

-- AddForeignKey
ALTER TABLE "FirmSubscription" ADD CONSTRAINT "FirmSubscription_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmSubscription" ADD CONSTRAINT "FirmSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "FirmSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingReceipt" ADD CONSTRAINT "BillingReceipt_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingReceipt" ADD CONSTRAINT "BillingReceipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed subscription plans
INSERT INTO "SubscriptionPlan" ("id", "code", "name", "monthlyPriceMad", "clientLimit", "userLimit", "storageLimitMb", "activeCollectionLimit", "hasZipExport", "hasAdvancedReports", "hasWhiteLabel", "hasWorkflowBuilder", "isActive", "createdAt", "updatedAt")
VALUES
  ('plan_starter', 'STARTER', 'Démarrage', 999, 30, 1, 5120, 1, false, false, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_pro', 'PRO', 'Pro', 1999, 100, 3, 20480, NULL, true, true, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_premium', 'PREMIUM', 'Premium', 4999, NULL, NULL, NULL, NULL, true, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "PlatformBillingSettings" ("id", "bankName", "accountHolder", "rib", "paymentInstructions", "supportEmail", "supportWhatsapp", "updatedAt")
VALUES (
  'default',
  'Banque à configurer',
  'TVA Collect SARL',
  '000000000000000000000000',
  'Merci d''effectuer le virement en indiquant la référence facture dans le libellé.',
  'billing@tvacollect.ma',
  '+212 600 00 00 00',
  CURRENT_TIMESTAMP
);
