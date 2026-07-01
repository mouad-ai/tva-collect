-- CreateEnum
CREATE TYPE "FiscalFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ClientTvaFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'EXEMPT', 'CUSTOM');

-- CreateTable
CREATE TABLE "FiscalConfig" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'MA',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "defaultTvaFrequency" "FiscalFrequency" NOT NULL DEFAULT 'MONTHLY',
    "defaultDeclarationDay" INTEGER NOT NULL DEFAULT 20,
    "defaultPaymentDay" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvaRate" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvaRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalRegime" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "FiscalFrequency" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalRegime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFiscalProfile" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "registreCommerce" TEXT,
    "cnssNumber" TEXT,
    "tvaRegimeId" TEXT,
    "tvaFrequency" "ClientTvaFrequency" NOT NULL DEFAULT 'MONTHLY',
    "declarationDayOverride" INTEGER,
    "paymentDayOverride" INTEGER,
    "fiscalRiskLevel" "FiscalSeverity" NOT NULL DEFAULT 'LOW',
    "assignedAccountantId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFiscalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfig_firmId_key" ON "FiscalConfig"("firmId");

-- CreateIndex
CREATE INDEX "FiscalConfig_firmId_idx" ON "FiscalConfig"("firmId");

-- CreateIndex
CREATE INDEX "TvaRate_firmId_idx" ON "TvaRate"("firmId");

-- CreateIndex
CREATE INDEX "TvaRate_firmId_isActive_idx" ON "TvaRate"("firmId", "isActive");

-- CreateIndex
CREATE INDEX "FiscalRegime_firmId_idx" ON "FiscalRegime"("firmId");

-- CreateIndex
CREATE INDEX "FiscalRegime_firmId_isActive_idx" ON "FiscalRegime"("firmId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientFiscalProfile_clientId_key" ON "ClientFiscalProfile"("clientId");

-- CreateIndex
CREATE INDEX "ClientFiscalProfile_firmId_idx" ON "ClientFiscalProfile"("firmId");

-- CreateIndex
CREATE INDEX "ClientFiscalProfile_firmId_fiscalRiskLevel_idx" ON "ClientFiscalProfile"("firmId", "fiscalRiskLevel");

-- CreateIndex
CREATE INDEX "ClientFiscalProfile_assignedAccountantId_idx" ON "ClientFiscalProfile"("assignedAccountantId");

-- AddForeignKey
ALTER TABLE "FiscalConfig" ADD CONSTRAINT "FiscalConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvaRate" ADD CONSTRAINT "TvaRate_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalRegime" ADD CONSTRAINT "FiscalRegime_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFiscalProfile" ADD CONSTRAINT "ClientFiscalProfile_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFiscalProfile" ADD CONSTRAINT "ClientFiscalProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
