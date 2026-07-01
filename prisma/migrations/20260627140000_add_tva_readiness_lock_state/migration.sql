CREATE TYPE "TvaPreparationStatus" AS ENUM (
  'COLLECTING',
  'READY_FOR_REVIEW',
  'UNDER_REVIEW',
  'READY_FOR_PREPARATION',
  'PREPARING',
  'MANAGER_REVIEW',
  'READY_TO_DECLARE',
  'DECLARED',
  'ARCHIVED',
  'BLOCKED'
);

ALTER TABLE "ClientCollection"
ADD COLUMN "tvaPreparationStatus" "TvaPreparationStatus" NOT NULL DEFAULT 'COLLECTING',
ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedByUserId" TEXT,
ADD COLUMN "lockReason" TEXT;

CREATE INDEX "ClientCollection_firmId_tvaPreparationStatus_idx" ON "ClientCollection"("firmId", "tvaPreparationStatus");
CREATE INDEX "ClientCollection_firmId_isLocked_idx" ON "ClientCollection"("firmId", "isLocked");
