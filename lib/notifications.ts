import { prisma } from "@/lib/prisma";

export async function getUnreadNotificationCount(userId: string, firmId: string) {
  const notificationState = await prisma.userNotificationState.findUnique({
    where: { userId },
    select: { lastSeenAt: true }
  });

  return prisma.operationalEvent.count({
    where: {
      firmId,
      occurredAt: notificationState ? { gt: notificationState.lastSeenAt } : undefined
    }
  });
}

export async function markNotificationsSeen(userId: string, firmId: string, seenAt = new Date()) {
  await prisma.userNotificationState.upsert({
    where: { userId },
    create: { userId, firmId, lastSeenAt: seenAt },
    update: { firmId, lastSeenAt: seenAt }
  });
}
