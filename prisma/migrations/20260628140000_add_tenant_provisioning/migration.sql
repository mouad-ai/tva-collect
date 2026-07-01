CREATE TYPE "FirmStatus" AS ENUM ('TRIAL', 'ACTIVE', 'OVERDUE', 'SUSPENDED', 'CANCELLED');

ALTER TABLE "Firm"
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'STARTER',
  ADD COLUMN "status" "FirmStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trialStartDate" TIMESTAMP(3),
  ADD COLUMN "trialEndDate" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "Firm" SET "status" = 'ACTIVE';

ALTER TABLE "User" ALTER COLUMN "firmId" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "UserInvite" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");
CREATE INDEX "UserInvite_firmId_idx" ON "UserInvite"("firmId");
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");

ALTER TABLE "UserInvite"
  ADD CONSTRAINT "UserInvite_firmId_fkey"
  FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "isActive", "firmId", "createdAt", "updatedAt")
SELECT
  'owner_' || f."id",
  f."name" || ' Owner',
  'owner@cabinet-demo.ma',
  admin."passwordHash",
  'OWNER',
  true,
  f."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Firm" f
CROSS JOIN LATERAL (
  SELECT "passwordHash"
  FROM "User"
  WHERE "email" = 'demo@tvacollect.ma'
  LIMIT 1
) admin
WHERE NOT EXISTS (
  SELECT 1 FROM "User" u WHERE u."email" = 'owner@cabinet-demo.ma'
)
ORDER BY f."createdAt" ASC
LIMIT 1;

UPDATE "User" SET "firmId" = NULL WHERE "role" = 'ADMIN';

ALTER TABLE "User"
  ADD CONSTRAINT "User_admin_firm_scope_check"
  CHECK (
    ("role" = 'ADMIN' AND "firmId" IS NULL)
    OR
    ("role" <> 'ADMIN' AND "firmId" IS NOT NULL)
  );
