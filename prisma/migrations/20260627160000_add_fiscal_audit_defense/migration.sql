CREATE TYPE "FiscalAuditCaseType" AS ENUM (
  'TAX_CONTROL',
  'INTERNAL_REVIEW',
  'CLIENT_DISPUTE',
  'MISSING_PROOF',
  'OTHER'
);

CREATE TYPE "FiscalAuditCaseStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'WAITING_AUTHORITY',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "FiscalSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "TaxAuthorityNoticeType" AS ENUM (
  'REQUEST_INFO',
  'PAYMENT_NOTICE',
  'PENALTY_NOTICE',
  'CORRECTION_REQUEST',
  'CONTROL_NOTICE',
  'OTHER'
);

CREATE TYPE "TaxAuthorityNoticeStatus" AS ENUM (
  'NEW',
  'REVIEWED',
  'RESPONSE_REQUIRED',
  'RESPONDED',
  'CLOSED'
);

CREATE TYPE "FiscalEvidenceRequestStatus" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'READY',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE "AuditResponseStatus" AS ENUM (
  'DRAFT',
  'REVIEW_REQUIRED',
  'APPROVED',
  'SENT'
);

CREATE TABLE "FiscalAuditCase" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "relatedFilingCaseId" TEXT,
  "title" TEXT NOT NULL,
  "type" "FiscalAuditCaseType" NOT NULL,
  "status" "FiscalAuditCaseStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "FiscalSeverity" NOT NULL DEFAULT 'MEDIUM',
  "openedByUserId" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FiscalAuditCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxAuthorityNotice" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientId" TEXT,
  "filingCaseId" TEXT,
  "auditCaseId" TEXT,
  "type" "TaxAuthorityNoticeType" NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseDeadline" TIMESTAMP(3),
  "referenceNumber" TEXT,
  "uploadedDocumentId" TEXT,
  "summary" TEXT,
  "status" "TaxAuthorityNoticeStatus" NOT NULL DEFAULT 'NEW',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxAuthorityNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalEvidenceRequest" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "auditCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "requestedBy" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" "FiscalEvidenceRequestStatus" NOT NULL DEFAULT 'TODO',
  "assignedUserId" TEXT,
  "evidenceDocumentIds" JSONB,
  "responseText" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FiscalEvidenceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditResponseDraft" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "auditCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "responseBody" TEXT NOT NULL,
  "attachedEvidenceIds" JSONB,
  "status" "AuditResponseStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuditResponseDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FiscalAuditCase_firmId_status_idx" ON "FiscalAuditCase"("firmId", "status");
CREATE INDEX "FiscalAuditCase_firmId_severity_idx" ON "FiscalAuditCase"("firmId", "severity");
CREATE INDEX "FiscalAuditCase_clientId_idx" ON "FiscalAuditCase"("clientId");
CREATE INDEX "FiscalAuditCase_relatedFilingCaseId_idx" ON "FiscalAuditCase"("relatedFilingCaseId");

CREATE INDEX "TaxAuthorityNotice_firmId_status_idx" ON "TaxAuthorityNotice"("firmId", "status");
CREATE INDEX "TaxAuthorityNotice_clientId_idx" ON "TaxAuthorityNotice"("clientId");
CREATE INDEX "TaxAuthorityNotice_filingCaseId_idx" ON "TaxAuthorityNotice"("filingCaseId");
CREATE INDEX "TaxAuthorityNotice_auditCaseId_idx" ON "TaxAuthorityNotice"("auditCaseId");
CREATE INDEX "TaxAuthorityNotice_responseDeadline_idx" ON "TaxAuthorityNotice"("responseDeadline");

CREATE INDEX "FiscalEvidenceRequest_firmId_status_idx" ON "FiscalEvidenceRequest"("firmId", "status");
CREATE INDEX "FiscalEvidenceRequest_auditCaseId_idx" ON "FiscalEvidenceRequest"("auditCaseId");
CREATE INDEX "FiscalEvidenceRequest_dueDate_idx" ON "FiscalEvidenceRequest"("dueDate");

CREATE INDEX "AuditResponseDraft_firmId_status_idx" ON "AuditResponseDraft"("firmId", "status");
CREATE INDEX "AuditResponseDraft_auditCaseId_idx" ON "AuditResponseDraft"("auditCaseId");
