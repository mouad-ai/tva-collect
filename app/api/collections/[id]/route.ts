import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFirmUser, requireMutableFirmUser } from "@/lib/auth";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { requireFirmCollection, TenantAccessError } from "@/lib/tenant";

const schema = z.object({
  name: z.string().min(1).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2024).max(2100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional()
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  try {
    await requireFirmCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId, deletedAt: null },
    include: {
      clientCollections: {
        where: { deletedAt: null },
        include: { client: true, requiredDocuments: true, uploadedDocuments: { where: { deletedAt: null } } }
      }
    }
  });
  if (!collection) return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });
  return NextResponse.json(collection);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Collecte invalide." }, { status: 400 });
  try {
    await requireFirmCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  const collection = await prisma.collectionPeriod.update({ where: { id }, data: body.data });
  return NextResponse.json(collection);
}
