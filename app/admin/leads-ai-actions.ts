"use server";

import { tasks } from "@trigger.dev/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logServerError } from "@/lib/error-logging";
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
//
// Returns void, not a result object: this is bound directly to a plain
// <form action={...}> in /admin/leads (not wrapped in useActionState), so a
// returned value would never actually reach the screen — worse, Next's own
// typing for a raw form action requires void | Promise<void> and rejects
// anything else at build time. On failure this logs through the same
// ALERT_WEBHOOK_URL path every other server error in this app uses, and
// draftStatus simply stays PENDING_APPROVAL so the button is just there to
// click again — no separate inline error UI to build for an internal tool.
export async function approveLeadDraftAction(leadId: string, formData: FormData) {
  await requireAdmin();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    await logServerError({ error: new Error("approveLeadDraftAction: lead not found"), metadata: { leadId } });
    return;
  }

  const finalMessage = text(formData, "draftMessage") || lead.draftMessage;
  if (!finalMessage) {
    await logServerError({ error: new Error("approveLeadDraftAction: no message to send"), firmId: lead.firmId, metadata: { leadId } });
    return;
  }
  if (!lead.phone) {
    await logServerError({ error: new Error("approveLeadDraftAction: lead has no phone number"), firmId: lead.firmId, metadata: { leadId } });
    return;
  }

  try {
    await sendWhatsAppMessage(lead.phone, finalMessage);
  } catch (error) {
    await logServerError({ error, firmId: lead.firmId, metadata: { leadId, context: "approve-lead-draft-send" } });
    return;
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
