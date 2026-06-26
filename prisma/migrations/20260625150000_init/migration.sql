CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "ClientCollectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MISSING', 'COMPLETE');
CREATE TYPE "RequiredDocumentStatus" AS ENUM ('MISSING', 'RECEIVED', 'NOT_APPLICABLE');
CREATE TYPE "ReminderChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PHONE', 'MANUAL');

CREATE TABLE "Firm" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "defaultRequiredDocuments" JSONB,
  "reminderTemplate" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "ice" TEXT,
  "taxId" TEXT,
  "city" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionPeriod" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "status" "CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollectionPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientCollection" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "collectionPeriodId" TEXT NOT NULL,
  "uploadToken" TEXT NOT NULL,
  "status" "ClientCollectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "accountantNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequiredDocument" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientCollectionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "status" "RequiredDocumentStatus" NOT NULL DEFAULT 'MISSING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequiredDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadedDocument" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientCollectionId" TEXT NOT NULL,
  "requiredDocumentId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedByName" TEXT,
  "uploaderComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderLog" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "clientCollectionId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "firmId" TEXT,
  "name" TEXT NOT NULL,
  "firmName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "numberOfClients" INTEGER,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");
CREATE INDEX "CollectionPeriod_firmId_idx" ON "CollectionPeriod"("firmId");
CREATE UNIQUE INDEX "ClientCollection_uploadToken_key" ON "ClientCollection"("uploadToken");
CREATE UNIQUE INDEX "ClientCollection_clientId_collectionPeriodId_key" ON "ClientCollection"("clientId", "collectionPeriodId");
CREATE INDEX "ClientCollection_firmId_idx" ON "ClientCollection"("firmId");
CREATE INDEX "RequiredDocument_firmId_idx" ON "RequiredDocument"("firmId");
CREATE INDEX "RequiredDocument_clientCollectionId_idx" ON "RequiredDocument"("clientCollectionId");
CREATE INDEX "UploadedDocument_firmId_idx" ON "UploadedDocument"("firmId");
CREATE INDEX "UploadedDocument_clientCollectionId_idx" ON "UploadedDocument"("clientCollectionId");
CREATE INDEX "ReminderLog_firmId_idx" ON "ReminderLog"("firmId");

ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionPeriod" ADD CONSTRAINT "CollectionPeriod_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCollection" ADD CONSTRAINT "ClientCollection_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCollection" ADD CONSTRAINT "ClientCollection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCollection" ADD CONSTRAINT "ClientCollection_collectionPeriodId_fkey" FOREIGN KEY ("collectionPeriodId") REFERENCES "CollectionPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_clientCollectionId_fkey" FOREIGN KEY ("clientCollectionId") REFERENCES "ClientCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_clientCollectionId_fkey" FOREIGN KEY ("clientCollectionId") REFERENCES "ClientCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_requiredDocumentId_fkey" FOREIGN KEY ("requiredDocumentId") REFERENCES "RequiredDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_clientCollectionId_fkey" FOREIGN KEY ("clientCollectionId") REFERENCES "ClientCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
