import { NextResponse } from "next/server";
import { OperationalActorType } from "@prisma/client";
import { requireMutableFirmUser } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { requireFirmDocument, TenantAccessError } from "@/lib/tenant";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMutableFirmUser();
  const { id } = await params;
  try {
    const document = await requireFirmDocument(user.firmId, id);
    await prisma.uploadedDocument.updateMany({
      where: { id, firmId: user.firmId },
      data: { deletedAt: new Date(), deletedByUserId: user.id, deleteReason: "Suppression API" }
    });
    await recordOperationalEvent({
      firmId: user.firmId,
      actorUserId: user.id,
      actorType: OperationalActorType.USER,
      clientId: document.clientCollection.clientId,
      collectionId: document.clientCollection.collectionPeriodId,
      clientCollectionId: document.clientCollectionId,
      documentId: id,
      eventType: "DOCUMENT_DELETED",
      eventTitle: "Document supprime",
      eventDescription: `${document.originalFileName} a été place dans la corbeille.`,
      source: "API_DOCUMENTS"
    });
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  return NextResponse.json({ ok: true });
}
