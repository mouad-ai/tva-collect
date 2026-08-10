import { task, logger } from "@trigger.dev/sdk";
import { normalizePhoneDigits, phoneMatchSuffix, stageForIntent } from "../lib/sales-ai";
import { prisma } from "../lib/prisma";
import { classifyInboundReply } from "./lib/ai";
import { sendWhatsAppMessage } from "./lib/whatsapp-bridge";

export const handleInboundReply = task({
  id: "handle-inbound-reply",
  run: async (payload: { phone: string; body: string; receivedAt: string }) => {
    const digits = normalizePhoneDigits(payload.phone);
    const suffix = phoneMatchSuffix(payload.phone);

    // Not a DB-level `contains` — Google Places numbers and manually-typed
    // ones are stored with spaces/dashes ("522-123456"), so the raw 9-digit
    // search key often isn't a literal substring of the stored value even
    // when the number is the same. Normalizing both sides in application
    // code is the only way to compare them correctly. Bounded to the 500
    // most recently touched leads — a full scan would be wrong at scale, but
    // comfortably covers this business's actual lead volume today.
    const candidates = await prisma.lead.findMany({
      where: { phone: { not: "" } },
      orderBy: { updatedAt: "desc" },
      take: 500
    });
    let lead = candidates.find((candidate) => phoneMatchSuffix(candidate.phone) === suffix) || null;

    if (!lead) {
      // Someone messaged us who isn't in the pipeline (wrong number, referral,
      // existing pilot using a different number...). Log it and flag for a
      // human instead of guessing — we have no context to reply safely.
      lead = await prisma.lead.create({
        data: {
          name: "",
          firmName: "Numéro inconnu",
          phone: digits,
          email: "",
          leadSource: "INBOUND_UNKNOWN",
          stage: "NEW",
          needsHumanReview: true
        }
      });
      logger.warn("Inbound message from unknown number — created stub lead.", { leadId: lead.id, phone: digits });
    }

    const now = new Date(payload.receivedAt);
    const windowOpenUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.leadMessage.create({
        data: { leadId: lead.id, direction: "INBOUND", body: payload.body, status: "DELIVERED", createdAt: now }
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: { lastInboundAt: now, conversationWindowOpenUntil: windowOpenUntil }
      })
    ]);

    const history = await prisma.leadMessage.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
      take: 20
    });
    const conversationHistory = history
      .slice(0, -1) // exclude the message we just inserted — it's passed separately as latestMessage
      .map((m) => `${m.direction === "OUTBOUND" ? "Nous" : "Prospect"} : ${m.body}`)
      .join("\n");

    const classification = await classifyInboundReply({ conversationHistory, latestMessage: payload.body });

    if (classification.needsHumanReview || !classification.suggestedReply.trim()) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          draftMessage: classification.suggestedReply || null,
          draftStatus: classification.suggestedReply.trim() ? "PENDING_APPROVAL" : "NONE",
          needsHumanReview: true,
          aiSummary: classification.summary,
          stage: stageForIntent(classification.intent, lead.stage)
        }
      });
      if (classification.suggestedReply.trim()) {
        await prisma.leadMessage.create({
          data: { leadId: lead.id, direction: "OUTBOUND", body: classification.suggestedReply, status: "PENDING_APPROVAL", aiIntent: classification.intent }
        });
      }
      logger.info("Inbound reply escalated to human review.", { leadId: lead.id, intent: classification.intent });
      return { autoReplied: false, intent: classification.intent };
    }

    // Safe to auto-reply: we're inside the 24h window the prospect just
    // opened by messaging us, and the AI judged this reply low-stakes
    // (e.g. the standard price-deferral script) rather than a real decision.
    await sendWhatsAppMessage(lead.phone, classification.suggestedReply);
    await prisma.$transaction([
      prisma.leadMessage.create({
        data: { leadId: lead.id, direction: "OUTBOUND", body: classification.suggestedReply, status: "SENT", aiIntent: classification.intent, sentAt: new Date() }
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactedAt: new Date(), aiSummary: classification.summary, stage: stageForIntent(classification.intent, lead.stage) }
      })
    ]);

    logger.info("Auto-replied to inbound message.", { leadId: lead.id, intent: classification.intent });
    return { autoReplied: true, intent: classification.intent };
  }
});
