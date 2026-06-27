import { OperationalActorType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EventInput = {
  firmId: string;
  actorUserId?: string | null;
  actorType: OperationalActorType;
  clientId?: string | null;
  collectionId?: string | null;
  clientCollectionId?: string | null;
  obligationId?: string | null;
  documentId?: string | null;
  eventType: string;
  eventTitle: string;
  eventDescription?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  source: string;
};

export function requestEventContext(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent")
  };
}

export async function recordOperationalEvent(input: EventInput) {
  await prisma.operationalEvent.create({
    data: {
      firmId: input.firmId,
      actorUserId: input.actorUserId || null,
      actorType: input.actorType,
      clientId: input.clientId || null,
      collectionId: input.collectionId || null,
      clientCollectionId: input.clientCollectionId || null,
      obligationId: input.obligationId || null,
      documentId: input.documentId || null,
      eventType: input.eventType,
      eventTitle: input.eventTitle,
      eventDescription: input.eventDescription || null,
      metadata: input.metadata,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      source: input.source
    }
  });
}
