import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFirmCollection, TenantAccessError } from "@/lib/tenant";

const schema = z.object({
  name: z.string().min(1).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2024).max(2100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  try {
    await requireFirmCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      clientCollections: {
        include: { client: true, requiredDocuments: true, uploadedDocuments: true }
      }
    }
  });
  if (!collection) return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });
  return NextResponse.json(collection);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Collecte invalide." }, { status: 400 });
  try {
    await requireFirmCollection(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  const collection = await prisma.collectionPeriod.update({ where: { id }, data: body.data });
  return NextResponse.json(collection);
}
