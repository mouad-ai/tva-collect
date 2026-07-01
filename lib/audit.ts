import { prisma } from "@/lib/prisma";
import { OperationalActorType, type Prisma } from "@prisma/client";

export async function auditEvent(input: {
  action: string;
  firmId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
}) {
  if (!input.firmId) return;
  await prisma.operationalEvent.create({
    data: {
      firmId: input.firmId,
      actorUserId: input.userId || null,
      actorType: input.userId ? OperationalActorType.USER : OperationalActorType.SYSTEM,
      eventType: input.action,
      eventTitle: input.action,
      eventDescription: [input.entityType, input.entityId].filter(Boolean).join(": ") || null,
      metadata: input.metadata,
      ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: input.request?.headers.get("user-agent") || null,
      source: "AUDIT"
    }
  });
}
