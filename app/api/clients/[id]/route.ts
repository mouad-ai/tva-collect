import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFirmClient, TenantAccessError } from "@/lib/tenant";

const clientSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let client;
  try {
    client = await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  return NextResponse.json(client);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = clientSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Client invalide." }, { status: 400 });
  try {
    await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  const client = await prisma.client.update({
    where: { id },
    data: { ...body.data, email: body.data.email || null }
  });
  return NextResponse.json(client);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  try {
    await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  const active = await prisma.clientCollection.count({
    where: { clientId: id, firmId: user.firmId, collectionPeriod: { status: "ACTIVE" } }
  });
  if (active > 0) {
    return NextResponse.json({ error: "Impossible de supprimer un client avec une collecte active." }, { status: 409 });
  }
  await prisma.client.deleteMany({ where: { id, firmId: user.firmId } });
  return NextResponse.json({ ok: true });
}
