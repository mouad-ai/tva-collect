CREATE TYPE "TvaFilingStatus" AS ENUM (
  'DRAFT',
  'READY_TO_FILE',
  'FILED',
  'PAYMENT_PENDING',
  'PAID',
  'ARCHIVED',
  'BLOCKED',
  'AMENDED'
);

CREATE TYPE "TvaSubmissionStatus" AS ENUM (
  'NOT_SUBMITTED',
  'SUBMITTED',
  'REJECTED',
  'NEEDS_CORRECTION'
);

CREATE TYPE "TvaPaymentStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'PAID',
  'LATE',
  'FAILED'
);

CREATE TYPE "TvaPaymentMethod" AS ENUM (
  'BANK_TRANSFER',
  'ONLINE_PORTAL',
  'CASH',
  'OTHER'
);

CREATE TYPE "FiscalReceiptType" AS ENUM (
  'DECLARATION_RECEIPT',
  'PAYMENT_RECEIPT',
  'PORTAL_SCREENSHOT',
  'TAX_AUTHORITY_REFERENCE',
  'OTHER'
);

CREATE TABLE "TvaFilingCase" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientCollectionId" TEXT NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "status" "TvaFilingStatus" NOT NULL DEFAULT 'DRAFT',
  "declarationDeadline" TIMESTAMP(3) NOT NULL,
  "paymentDeadline" TIMESTAMP(3) NOT NULL,
  "assignedUserId" TEXT,
  "preparedByUserId" TEXT,
  "filedByUserId" TEXT,
  "filedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TvaFilingCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TvaSubmission" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "filingCaseId" TEXT NOT NULL,
  "status" "TvaSubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "externalReference" TEXT,
  "submittedAt" TIMESTAMP(3),
  "submittedByUserId" TEXT,
  "submissionProofDocumentId" TEXT,
  "rejectionReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TvaSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TvaPayment" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "filingCaseId" TEXT NOT NULL,
  "status" "TvaPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountDue" DECIMAL(12,2),
  "amountPaid" DECIMAL(12,2),
  "paymentDate" TIMESTAMP(3),
  "paymentMethod" "TvaPaymentMethod",
  "paymentReference" TEXT,
  "paymentProofDocumentId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TvaPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalReceipt" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "filingCaseId" TEXT NOT NULL,
  "type" "FiscalReceiptType" NOT NULL,
  "uploadedDocumentId" TEXT,
  "referenceNumber" TEXT,
  "receiptDate" TIMESTAMP(3),
  "uploadedByUserId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FiscalReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TvaFilingCase_clientCollectionId_key" ON "TvaFilingCase"("clientCollectionId");
CREATE INDEX "TvaFilingCase_firmId_status_idx" ON "TvaFilingCase"("firmId", "status");
CREATE INDEX "TvaFilingCase_clientId_idx" ON "TvaFilingCase"("clientId");
CREATE INDEX "TvaFilingCase_clientCollectionId_idx" ON "TvaFilingCase"("clientCollectionId");
CREATE INDEX "TvaFilingCase_declarationDeadline_idx" ON "TvaFilingCase"("declarationDeadline");
CREATE INDEX "TvaFilingCase_paymentDeadline_idx" ON "TvaFilingCase"("paymentDeadline");

CREATE INDEX "TvaSubmission_firmId_status_idx" ON "TvaSubmission"("firmId", "status");
CREATE INDEX "TvaSubmission_filingCaseId_idx" ON "TvaSubmission"("filingCaseId");

CREATE UNIQUE INDEX "TvaPayment_filingCaseId_key" ON "TvaPayment"("filingCaseId");
CREATE INDEX "TvaPayment_firmId_status_idx" ON "TvaPayment"("firmId", "status");
CREATE INDEX "TvaPayment_filingCaseId_idx" ON "TvaPayment"("filingCaseId");

CREATE INDEX "FiscalReceipt_firmId_type_idx" ON "FiscalReceipt"("firmId", "type");
CREATE INDEX "FiscalReceipt_filingCaseId_idx" ON "FiscalReceipt"("filingCaseId");
