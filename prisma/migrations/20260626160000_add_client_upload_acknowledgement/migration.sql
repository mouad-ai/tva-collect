ALTER TABLE "UploadedDocument"
ADD COLUMN "clientAcknowledgedDelayRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "clientAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN "clientAcknowledgementText" TEXT;
