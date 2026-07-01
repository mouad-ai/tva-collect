-- Production hardening: roles, disabled users, upload-token controls, file scans,
-- soft delete recovery, and server error logs.

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'ASSISTANT', 'READ_ONLY', 'ADMIN');
CREATE TYPE "DocumentSecurityScanStatus" AS ENUM ('PENDING', 'CLEAN', 'SUSPICIOUS', 'INFECTED', 'FAILED', 'QUARANTINED');
CREATE TYPE "ScannerProvider" AS ENUM ('NONE', 'CLAMAV', 'EXTERNAL', 'MANUAL');
CREATE TYPE "ErrorSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "disabledAt" TIMESTAMP(3),
  ADD COLUMN "disabledReason" TEXT;

ALTER TABLE "Client"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT,
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "CollectionPeriod"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT,
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "ClientCollection"
  ADD COLUMN "uploadTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "uploadTokenDisabledAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT,
  ADD COLUMN "deleteReason" TEXT;

UPDATE "ClientCollection"
SET "uploadTokenExpiresAt" = NOW() + INTERVAL '90 days'
WHERE "uploadTokenExpiresAt" IS NULL;

ALTER TABLE "UploadedDocument"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT,
  ADD COLUMN "deleteReason" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "DocumentSecurityScan" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "status" "DocumentSecurityScanStatus" NOT NULL DEFAULT 'PENDING',
  "scannerProvider" "ScannerProvider" NOT NULL DEFAULT 'NONE',
  "scannerVersion" TEXT,
  "details" TEXT,
  "scannedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSecurityScan_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DocumentSecurityScan" ("id", "firmId", "documentId", "status", "scannerProvider", "details", "scannedAt", "createdAt", "updatedAt")
SELECT
  'scan_' || "id",
  "firmId",
  "id",
  'CLEAN',
  'NONE',
  'Existing document marked clean during hardening migration.',
  NOW(),
  NOW(),
  NOW()
FROM "UploadedDocument"
ON CONFLICT DO NOTHING;

CREATE TABLE "ErrorLog" (
  "id" TEXT NOT NULL,
  "firmId" TEXT,
  "userId" TEXT,
  "requestId" TEXT NOT NULL,
  "route" TEXT,
  "method" TEXT,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "severity" "ErrorSeverity" NOT NULL DEFAULT 'ERROR',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentSecurityScan_documentId_key" ON "DocumentSecurityScan"("documentId");
CREATE INDEX "DocumentSecurityScan_firmId_idx" ON "DocumentSecurityScan"("firmId");
CREATE INDEX "DocumentSecurityScan_firmId_status_idx" ON "DocumentSecurityScan"("firmId", "status");

CREATE UNIQUE INDEX "ErrorLog_requestId_key" ON "ErrorLog"("requestId");
CREATE INDEX "ErrorLog_firmId_idx" ON "ErrorLog"("firmId");
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

CREATE INDEX "User_firmId_idx" ON "User"("firmId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "Client_firmId_deletedAt_idx" ON "Client"("firmId", "deletedAt");
CREATE INDEX "CollectionPeriod_firmId_deletedAt_idx" ON "CollectionPeriod"("firmId", "deletedAt");
CREATE INDEX "ClientCollection_firmId_deletedAt_idx" ON "ClientCollection"("firmId", "deletedAt");
CREATE INDEX "ClientCollection_uploadTokenExpiresAt_idx" ON "ClientCollection"("uploadTokenExpiresAt");
CREATE INDEX "ClientCollection_uploadTokenDisabledAt_idx" ON "ClientCollection"("uploadTokenDisabledAt");
CREATE INDEX "UploadedDocument_firmId_deletedAt_idx" ON "UploadedDocument"("firmId", "deletedAt");

ALTER TABLE "DocumentSecurityScan"
  ADD CONSTRAINT "DocumentSecurityScan_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DocumentSecurityScan_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ErrorLog"
  ADD CONSTRAINT "ErrorLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
