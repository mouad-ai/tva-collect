ALTER TABLE "Lead"
ADD COLUMN "city" TEXT,
ADD COLUMN "numberOfAssistants" INTEGER,
ADD COLUMN "currentWorkflow" TEXT,
ADD COLUMN "painLevel" TEXT,
ADD COLUMN "leadSource" TEXT,
ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN "assignedOwner" TEXT,
ADD COLUMN "expectedPlan" TEXT,
ADD COLUMN "expectedSetupFee" INTEGER,
ADD COLUMN "preferredDemoAt" TIMESTAMP(3),
ADD COLUMN "biggestProblem" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Lead_stage_idx" ON "Lead"("stage");
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");
