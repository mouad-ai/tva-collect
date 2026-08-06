"use server";

import { tasks } from "@trigger.dev/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/trigger/lib/whatsapp-bridge";
import type { draftFirstContact } from "@/trigger/draft-first-contact";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function generateLeadDraftAction(leadId: string) {
  await requireAdmin();
  await tasks.trigger<typeof draftFirstContact>("draft-first-contact", { leadId });
  revalidatePath("/admin/leads");
}

// The only place in this codebase that sends a first/cold WhatsApp message —
// deliberately gated behind a human clicking this button. See
// whatsapp-bridge/src/index.ts and trigger/draft-first-contact.ts for why
// the AI is never allowed to call this on its own for a new contact.
export async function approveLeadDraftAction(leadId: string, formData: FormData) {
  await requireAdmin();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Prospect introuvable." };

  const finalMessage = text(formData, "draftMessage") || lead.draftMessage;
  if (!finalMessage) return { error: "Aucun message à envoyer." };
  if (!lead.phone) return { error: "Ce prospect n'a pas de numéro de téléphone." };

  try {
    await sendWhatsAppMessage(lead.phone, finalMessage);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec de l'envoi WhatsApp." };
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        draftMessage: null,
        draftStatus: "SENT",
        needsHumanReview: false,
        lastContactedAt: new Date(),
        stage: lead.stage === "NEW" ? "CONTACTED" : lead.stage
      }
    }),
    prisma.leadMessage.updateMany({
      where: { leadId, status: "PENDING_APPROVAL" },
      data: { status: "SENT", body: finalMessage, sentAt: new Date() }
    })
  ]);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function rejectLeadDraftAction(leadId: string) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { draftMessage: null, draftStatus: "REJECTED", needsHumanReview: false }
    }),
    prisma.leadMessage.updateMany({
      where: { leadId, status: "PENDING_APPROVAL" },
      data: { status: "FAILED" }
    })
  ]);
  revalidatePath("/admin/leads");
}
