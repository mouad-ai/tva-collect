-- CreateEnum
CREATE TYPE "TvaReadinessStatus" AS ENUM ('NOT_READY', 'READY_WITH_WARNINGS', 'READY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TvaAmountEntryType" AS ENUM ('PURCHASE', 'SALE', 'EXPENSE', 'CREDIT_NOTE');

-- CreateTable
CREATE TABLE "TvaReadinessCheck" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientCollectionId" TEXT NOT NULL,
    "status" "TvaReadinessStatus" NOT NULL,
    "missingDocumentsCount" INTEGER NOT NULL DEFAULT 0,
    "unreviewedDocumentsCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedDocumentsCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedQuestionsCount" INTEGER NOT NULL DEFAULT 0,
    "pendingDeclarationsCount" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "FiscalSeverity" NOT NULL DEFAULT 'LOW',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TvaReadinessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvaAmountEntry" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientCollectionId" TEXT NOT NULL,
    "uploadedDocumentId" TEXT,
    "type" "TvaAmountEntryType" NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "supplierOrCustomerName" TEXT,
    "amountHT" DECIMAL(12,2) NOT NULL,
    "amountTVA" DECIMAL(12,2) NOT NULL,
    "amountTTC" DECIMAL(12,2) NOT NULL,
    "tvaRate" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvaAmountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TvaReadinessCheck_firmId_generatedAt_idx" ON "TvaReadinessCheck"("firmId", "generatedAt");

-- CreateIndex
CREATE INDEX "TvaReadinessCheck_clientCollectionId_idx" ON "TvaReadinessCheck"("clientCollectionId");

-- CreateIndex
CREATE INDEX "TvaReadinessCheck_firmId_status_idx" ON "TvaReadinessCheck"("firmId", "status");

-- CreateIndex
CREATE INDEX "TvaAmountEntry_firmId_idx" ON "TvaAmountEntry"("firmId");

-- CreateIndex
CREATE INDEX "TvaAmountEntry_clientId_idx" ON "TvaAmountEntry"("clientId");

-- CreateIndex
CREATE INDEX "TvaAmountEntry_clientCollectionId_idx" ON "TvaAmountEntry"("clientCollectionId");

-- CreateIndex
CREATE INDEX "TvaAmountEntry_uploadedDocumentId_idx" ON "TvaAmountEntry"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "TvaAmountEntry_firmId_type_idx" ON "TvaAmountEntry"("firmId", "type");

-- AddForeignKey
ALTER TABLE "TvaReadinessCheck" ADD CONSTRAINT "TvaReadinessCheck_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaReadinessCheck" ADD CONSTRAINT "TvaReadinessCheck_clientCollectionId_fkey" FOREIGN KEY ("clientCollectionId") REFERENCES "ClientCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaAmountEntry" ADD CONSTRAINT "TvaAmountEntry_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaAmountEntry" ADD CONSTRAINT "TvaAmountEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaAmountEntry" ADD CONSTRAINT "TvaAmountEntry_clientCollectionId_fkey" FOREIGN KEY ("clientCollectionId") REFERENCES "ClientCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaAmountEntry" ADD CONSTRAINT "TvaAmountEntry_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
