CREATE TYPE "OperationalActorType" AS ENUM ('USER', 'CLIENT', 'SYSTEM');

CREATE TABLE "OperationalEvent" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorType" "OperationalActorType" NOT NULL,
  "clientId" TEXT,
  "collectionId" TEXT,
  "clientCollectionId" TEXT,
  "obligationId" TEXT,
  "documentId" TEXT,
  "eventType" TEXT NOT NULL,
  "eventTitle" TEXT NOT NULL,
  "eventDescription" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "source" TEXT NOT NULL,

  CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalEvent_firmId_occurredAt_idx" ON "OperationalEvent"("firmId", "occurredAt");
CREATE INDEX "OperationalEvent_clientId_idx" ON "OperationalEvent"("clientId");
CREATE INDEX "OperationalEvent_collectionId_idx" ON "OperationalEvent"("collectionId");
CREATE INDEX "OperationalEvent_clientCollectionId_idx" ON "OperationalEvent"("clientCollectionId");
CREATE INDEX "OperationalEvent_documentId_idx" ON "OperationalEvent"("documentId");
CREATE INDEX "OperationalEvent_eventType_idx" ON "OperationalEvent"("eventType");
