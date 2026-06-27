CREATE TYPE "WorkflowType" AS ENUM (
  'TVA_MONTHLY',
  'TVA_QUARTERLY',
  'CNSS_MONTHLY',
  'PAYROLL',
  'ANNUAL_CLOSING',
  'BANK_DOCUMENTS',
  'LEGAL_DOCUMENTS',
  'CLIENT_ONBOARDING',
  'EMPLOYEE_DOCUMENTS',
  'SUPPLIER_DOCUMENTS',
  'CUSTOM'
);

ALTER TABLE "CollectionPeriod"
ADD COLUMN "workflowType" "WorkflowType" NOT NULL DEFAULT 'TVA_MONTHLY';

CREATE INDEX "CollectionPeriod_firmId_workflowType_idx" ON "CollectionPeriod"("firmId", "workflowType");
