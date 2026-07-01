CREATE TABLE "UserNotificationState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNotificationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationState_userId_key" ON "UserNotificationState"("userId");
CREATE INDEX "UserNotificationState_firmId_idx" ON "UserNotificationState"("firmId");

ALTER TABLE "UserNotificationState"
ADD CONSTRAINT "UserNotificationState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
