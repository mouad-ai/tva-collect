import { NextResponse } from "next/server";
import { OperationalActorType } from "@prisma/client";
import { z } from "zod";
import { requireFirmUser, requireMutableFirmUser } from "@/lib/auth";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { loggedApiError } from "@/lib/error-logging";
import { recordOperationalEvent } from "@/lib/operational-events";
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  let client;
  try {
    client = await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  return NextResponse.json(client);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const { id } = await params;
  const body = clientSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Client invalide." }, { status: 400 });
  try {
    await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  const client = await prisma.client.update({
    where: { id },
    data: { ...body.data, email: body.data.email || null }
  });
  return NextResponse.json(client);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const { id } = await params;
  try {
    await requireFirmClient(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
  const active = await prisma.clientCollection.count({
    where: { clientId: id, firmId: user.firmId, deletedAt: null, collectionPeriod: { status: "ACTIVE", deletedAt: null } }
  });
  if (active > 0) {
    return NextResponse.json({ error: "Impossible de supprimer un client avec une collecte active." }, { status: 409 });
  }
  await prisma.client.updateMany({
    where: { id, firmId: user.firmId },
    data: { deletedAt: new Date(), deletedByUserId: user.id, deleteReason: "Suppression API" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: id,
    eventType: "CLIENT_DELETED",
    eventTitle: "Client supprime",
    eventDescription: "Client place dans la corbeille.",
    source: "API_CLIENTS"
  });
  return NextResponse.json({ ok: true });
}
