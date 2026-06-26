import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { defaultRequiredDocuments } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { generateUploadToken } from "@/lib/tva";

const schema = z.object({
  clientIds: z.array(z.string()).min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Clients invalides." }, { status: 400 });

  const collection = await prisma.collectionPeriod.findFirst({ where: { id, firmId: user.firmId } });
  if (!collection) return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });

  const clients = await prisma.client.findMany({
    where: { id: { in: body.data.clientIds }, firmId: user.firmId }
  });

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
        requiredDocuments: {
          create: defaultRequiredDocuments.map((name) => ({ firmId: user.firmId, name, isRequired: true }))
        }
      }
    });
    created.push(clientCollection);
  }

  return NextResponse.json(created, { status: 201 });
}
