import { ReminderChannel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReminderMessage, missingDocuments } from "@/lib/tva";

const schema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL"])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Canal invalide." }, { status: 400 });

  const item = await prisma.clientCollection.findFirst({
    where: { id, firmId: user.firmId },
    include: { client: true, collectionPeriod: true, requiredDocuments: true, firm: true }
  });
  if (!item) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });

  const channel = body.data.channel as ReminderChannel;
  const message = generateReminderMessage(
    {
      clientName: item.client.contactName || item.client.companyName,
      firmName: item.firm.name,
      month: item.collectionPeriod.month,
      year: item.collectionPeriod.year,
      uploadToken: item.uploadToken,
      missingDocuments: missingDocuments(item.requiredDocuments)
    },
    channel
  );

  await prisma.reminderLog.create({
    data: { firmId: user.firmId, clientCollectionId: id, channel, message }
  });

  return NextResponse.json({ message });
}
