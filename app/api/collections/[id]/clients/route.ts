import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMutableFirmUser } from "@/lib/auth";
import { requiredDocumentsFromFirm, workflowTemplateFromType } from "@/lib/constants";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { requireFirmCollection, TenantAccessError } from "@/lib/tenant";
import { generateUploadToken, uploadTokenExpiryDate } from "@/lib/tva";

const schema = z.object({
  clientIds: z.array(z.string()).min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Clients invalides." }, { status: 400 });

  try {
    await requireFirmCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  const collection = await prisma.collectionPeriod.findFirst({ where: { id, firmId: user.firmId, deletedAt: null } });
  if (!collection) return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });
  const requiredDocuments =
    collection.workflowType === "TVA_MONTHLY" || collection.workflowType === "TVA_QUARTERLY"
      ? requiredDocumentsFromFirm(user.firm.defaultRequiredDocuments)
      : [...workflowTemplateFromType(collection.workflowType).documents];

  const clients = await prisma.client.findMany({
    where: { id: { in: body.data.clientIds }, firmId: user.firmId, deletedAt: null }
  });
  if (clients.length !== body.data.clientIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs clients sont introuvables pour ce cabinet." }, { status: 404 });
  }

  const created = [];
  for (const client of clients) {
    const clientCollection = await prisma.clientCollection.upsert({
      where: { clientId_collectionPeriodId: { clientId: client.id, collectionPeriodId: id } },
      update: {},
      create: {
        firmId: user.firmId,
        clientId: client.id,
        collectionPeriodId: id,
        uploadToken: generateUploadToken(),
        uploadTokenExpiresAt: uploadTokenExpiryDate(),
        requiredDocuments: {
          create: requiredDocuments.map((name) => ({ firmId: user.firmId, name, isRequired: true }))
        }
      }
    });
    created.push(clientCollection);
  }

  return NextResponse.json(created, { status: 201 });
}
