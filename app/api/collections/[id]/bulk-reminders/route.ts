import { ReminderChannel } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReminderMessage, missingDocuments } from "@/lib/tva";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      firm: true,
      clientCollections: {
        where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "MISSING"] } },
        include: { client: true, requiredDocuments: true },
        orderBy: { client: { companyName: "asc" } }
      }
    }
  });

  if (!collection) {
    return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });
  }

  const channel = ReminderChannel.WHATSAPP;
  const blocks: string[] = [];

  for (const item of collection.clientCollections) {
    const missing = missingDocuments(item.requiredDocuments);
    if (!missing.length && item.status !== "NOT_STARTED") continue;

    const message = generateReminderMessage({
      clientName: item.client.contactName || item.client.companyName,
      firmName: collection.firm.name,
      month: collection.month,
      year: collection.year,
      workflowType: collection.workflowType,
      uploadToken: item.uploadToken,
      missingDocuments: missing,
      template: collection.firm.reminderTemplate
    }, channel);

    await prisma.reminderLog.create({
      data: { firmId: user.firmId, clientCollectionId: item.id, channel, message }
    });

    blocks.push([
      `Client: ${item.client.companyName}`,
      `Phone: ${item.client.phone || "-"}`,
      "",
      message
    ].join("\n"));
  }

  return NextResponse.json({
    text: blocks.length ? blocks.join("\n\n---\n\n") : "Aucune relance a copier pour cette collecte."
  });
}
