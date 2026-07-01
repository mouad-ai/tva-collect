-- CreateEnum
CREATE TYPE "ReleaseChecklistStatus" AS ENUM ('TODO', 'PASSED', 'FAILED', 'BLOCKED');

-- CreateTable
CREATE TABLE "ReleaseChecklistItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "ReleaseChecklistStatus" NOT NULL DEFAULT 'TODO',
    "notes" TEXT,
    "checkedByUserId" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseChecklistItem_key_key" ON "ReleaseChecklistItem"("key");

-- CreateIndex
CREATE INDEX "ReleaseChecklistItem_status_idx" ON "ReleaseChecklistItem"("status");

-- CreateIndex
CREATE INDEX "ReleaseChecklistItem_checkedByUserId_idx" ON "ReleaseChecklistItem"("checkedByUserId");

-- AddForeignKey
ALTER TABLE "ReleaseChecklistItem" ADD CONSTRAINT "ReleaseChecklistItem_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
