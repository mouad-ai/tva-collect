import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMutableFirmUser } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { requireFirmClientCollection, TenantAccessError } from "@/lib/tenant";
import { recalculateClientCollectionStatus } from "@/lib/tva";

const schema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "MISSING", "COMPLETE"]).optional(),
  requiredDocumentId: z.string().optional(),
  requiredDocumentStatus: z.enum(["MISSING", "RECEIVED", "NOT_APPLICABLE"]).optional()
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMutableFirmUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  try {
    await requireFirmClientCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }

  if (body.data.requiredDocumentId && body.data.requiredDocumentStatus) {
    await prisma.requiredDocument.updateMany({
      where: {
        id: body.data.requiredDocumentId,
        firmId: user.firmId,
        clientCollectionId: id
      },
      data: { status: body.data.requiredDocumentStatus }
    });
    await recalculateClientCollectionStatus(id);
  } else if (body.data.status) {
    await prisma.clientCollection.update({ where: { id }, data: { status: body.data.status } });
  } else {
    await recalculateClientCollectionStatus(id);
  }

  return NextResponse.json({ ok: true });
}
