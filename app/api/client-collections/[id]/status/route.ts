import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateClientCollectionStatus } from "@/lib/tva";

const schema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "MISSING", "COMPLETE"]).optional(),
  requiredDocumentId: z.string().optional(),
  requiredDocumentStatus: z.enum(["MISSING", "RECEIVED", "NOT_APPLICABLE"]).optional()
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  const clientCollection = await prisma.clientCollection.findFirst({ where: { id, firmId: user.firmId } });
  if (!clientCollection) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });

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
