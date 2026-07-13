import { OperationalActorType, ReminderChannel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMutableFirmUser } from "@/lib/auth";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { sendReminderEmail } from "@/lib/email";
import { loggedApiError, logServerError } from "@/lib/error-logging";
import { recordOperationalEvent, requestEventContext } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { generateReminderMessage, missingDocuments } from "@/lib/tva";

const schema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL"])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireMutableFirmUser();
  const { id } = await params;
  try {
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Canal invalide." }, { status: 400 });

    const item = await prisma.clientCollection.findFirst({
      where: { id, firmId: user.firmId },
      include: { client: true, collectionPeriod: true, requiredDocuments: true, firm: true }
    });
    if (!item) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });

    const channel = body.data.channel as ReminderChannel;

    // Email is an actual send, not just generated text — refuse up front rather
    // than silently "succeeding" with nowhere to deliver the message.
    if (channel === ReminderChannel.EMAIL && !item.client.email) {
      return NextResponse.json({ error: "Ce client n'a pas d'adresse email enregistrée." }, { status: 400 });
    }

    const message = generateReminderMessage(
      {
        clientName: item.client.contactName || item.client.companyName,
        firmName: item.firm.name,
        month: item.collectionPeriod.month,
        year: item.collectionPeriod.year,
        workflowType: item.collectionPeriod.workflowType,
        uploadToken: item.uploadToken,
        missingDocuments: missingDocuments(item.requiredDocuments),
        template: item.firm.reminderTemplate
      },
      channel
    );

    if (channel === ReminderChannel.EMAIL) {
      try {
        await sendReminderEmail({ to: item.client.email as string, firmName: item.firm.name, message });
      } catch (error) {
        await logServerError({
          error,
          request,
          firmId: user.firmId,
          userId: user.id,
          metadata: { clientCollectionId: id, context: "reminder-email" }
        });
        return NextResponse.json({ error: "Échec de l'envoi de l'email. Réessayez ou contactez le support." }, { status: 502 });
      }
    }

    const reminder = await prisma.reminderLog.create({
      data: { firmId: user.firmId, clientCollectionId: id, channel, message }
    });
    await recordOperationalEvent({
      firmId: user.firmId,
      actorUserId: user.id,
      actorType: OperationalActorType.USER,
      clientId: item.clientId,
      collectionId: item.collectionPeriodId,
      clientCollectionId: item.id,
      eventType: channel === ReminderChannel.EMAIL ? "REMINDER_EMAIL_SENT" : "REMINDER_GENERATED",
      eventTitle: channel === ReminderChannel.EMAIL ? "Relance email envoyée" : "Relance générée",
      eventDescription:
        channel === ReminderChannel.EMAIL
          ? `Email de relance envoyé à ${item.client.email}.`
          : `Relance ${channel} générée pour ${item.client.companyName}.`,
      metadata: {
        reminderId: reminder.id,
        channel,
        missingDocuments: missingDocuments(item.requiredDocuments),
        message
      },
      ...requestEventContext(request),
      source: "APP_REMINDER"
    });

    return NextResponse.json({ message, sent: channel === ReminderChannel.EMAIL });
  } catch (error) {
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }
}
