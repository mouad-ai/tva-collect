CREATE TYPE "LeadDraftStatus" AS ENUM ('NONE', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED');
CREATE TYPE "LeadMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "LeadMessageStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'DELIVERED', 'FAILED');

ALTER TABLE "Lead"
  ADD COLUMN "googlePlaceId" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "draftMessage" TEXT,
  ADD COLUMN "draftStatus" "LeadDraftStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiSummary" TEXT,
  ADD COLUMN "lastContactedAt" TIMESTAMP(3),
  ADD COLUMN "lastInboundAt" TIMESTAMP(3),
  ADD COLUMN "conversationWindowOpenUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "Lead_googlePlaceId_key" ON "Lead"("googlePlaceId");
CREATE INDEX "Lead_draftStatus_idx" ON "Lead"("draftStatus");

CREATE TABLE "LeadMessage" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "direction" "LeadMessageDirection" NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
  "body" TEXT NOT NULL,
  "status" "LeadMessageStatus" NOT NULL DEFAULT 'DRAFT',
  "aiIntent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),

  CONSTRAINT "LeadMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadMessage_leadId_idx" ON "LeadMessage"("leadId");
CREATE INDEX "LeadMessage_createdAt_idx" ON "LeadMessage"("createdAt");

ALTER TABLE "LeadMessage"
  ADD CONSTRAINT "LeadMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
