import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { draftMessage } from "./lib/ai";

// Drafts a first-contact message for a lead. NEVER sends it — WhatsApp policy
// (and plain ban-risk on the unofficial route) requires a human to approve
// the first message to anyone who hasn't messaged us first. This just gets
// the draft ready so approving takes one click in /admin/leads instead of
// writing the message from scratch each time.
export const draftFirstContact = task({
  id: "draft-first-contact",
  run: async (payload: { leadId: string }) => {
    const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
    if (!lead) {
      logger.error("Lead not found", { leadId: payload.leadId });
      return { drafted: false };
    }
    if (lead.draftStatus === "PENDING_APPROVAL") {
      // Only block when a draft is genuinely already waiting on approval — a
      // human clicking "Générer un nouveau message" from /admin/leads on a
      // SENT or REJECTED lead is a deliberate request for a fresh draft, not
      // a duplicate call to short-circuit.
      logger.info("Lead already has a pending draft — skipping.", { leadId: lead.id });
      return { drafted: false };
    }

    const context = [
      `Cabinet : ${lead.firmName || "inconnu"}`,
      `Ville : ${lead.city || lead.address || "inconnue"}`,
      lead.numberOfClients ? `Nombre de clients estimé : ${lead.numberOfClients}` : null
    ]
      .filter(Boolean)
      .join("\n");

    const message = await draftMessage({
      purpose: "Rédige un premier message WhatsApp de prise de contact avec ce cabinet comptable, pour lui proposer de devenir cabinet pilote gratuit.",
      context
    });

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: { draftMessage: message, draftStatus: "PENDING_APPROVAL", needsHumanReview: true }
      }),
      prisma.leadMessage.create({
        data: { leadId: lead.id, direction: "OUTBOUND", body: message, status: "PENDING_APPROVAL" }
      })
    ]);

    logger.info("First-contact draft ready for approval.", { leadId: lead.id });
    return { drafted: true };
  }
});
