import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function auditEvent(input: {
  action: string;
  firmId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
}) {
  await prisma.auditEvent.create({
    data: {
      action: input.action,
      firmId: input.firmId || null,
      userId: input.userId || null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      metadata: input.metadata,
      ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: input.request?.headers.get("user-agent") || null
    }
  });
}
