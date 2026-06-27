import { WorkflowType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  workflowType: z.nativeEnum(WorkflowType).default(WorkflowType.TVA_MONTHLY),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2100),
  clientIds: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).default("ACTIVE")
});

export async function GET() {
  const user = await requireUser();
  const collections = await prisma.collectionPeriod.findMany({
    where: { firmId: user.firmId },
    include: { clientCollections: true },
    orderBy: [{ year: "desc" }, { month: "desc" }]
  });
  return NextResponse.json(collections);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Collecte invalide." }, { status: 400 });
  if (body.data.clientIds?.length) {
    const clients = await prisma.client.findMany({ where: { firmId: user.firmId, id: { in: body.data.clientIds } } });
    if (clients.length !== body.data.clientIds.length) {
      return NextResponse.json({ error: "Un ou plusieurs clients sont introuvables pour ce cabinet." }, { status: 404 });
    }
  }
  const collection = await prisma.collectionPeriod.create({
    data: {
      name: body.data.name,
      workflowType: body.data.workflowType,
      month: body.data.month,
      year: body.data.year,
      status: body.data.status,
      firmId: user.firmId
    }
  });
  return NextResponse.json(collection, { status: 201 });
}
