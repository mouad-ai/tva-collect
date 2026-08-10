import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "../lib/prisma";
import { draftMessage } from "./lib/ai";

const SILENCE_THRESHOLD_DAYS = 3;
const MAX_FOLLOW_UPS_PER_RUN = 20; // keeps this at the same human-followable pace as everything else

export const followUpScheduler = schedules.task({
  id: "follow-up-scheduler",
  cron: { pattern: "0 8 * * *", timezone: "Africa/Casablanca" }, // 8h chaque matin
  run: async () => {
    const threshold = new Date(Date.now() - SILENCE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Went quiet: we contacted them, they never replied since, no follow-up
    // already queued or sent recently. A follow-up after days of silence is
    // outside WhatsApp's 24h free-form window either way, so — same as first
    // contact — it always goes through human approval, never auto-sent.
    const candidates = await prisma.lead.findMany({
      where: {
        stage: { in: ["CONTACTED", "QUALIFIED"] },
        lastContactedAt: { lt: threshold },
        draftStatus: "NONE",
        OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: threshold } }]
      },
      take: MAX_FOLLOW_UPS_PER_RUN
    });

    let drafted = 0;
    for (const lead of candidates) {
      const history = await prisma.leadMessage.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        take: 5
      });
      const context = [
        `Cabinet : ${lead.firmName || "inconnu"}`,
        `Dernier message envoyé il y a plus de ${SILENCE_THRESHOLD_DAYS} jours, sans réponse.`,
        history.length ? `Derniers échanges :\n${history.reverse().map((m) => `${m.direction === "OUTBOUND" ? "Nous" : "Prospect"} : ${m.body}`).join("\n")}` : null
      ]
        .filter(Boolean)
        .join("\n");

      let message: string;
      try {
        message = await draftMessage({
          purpose: "Rédige une relance douce, courte, sans pression, avec une porte de sortie honorable pour le prospect.",
          context
        });
      } catch (error) {
        logger.error("Follow-up drafting failed", { leadId: lead.id, error: error instanceof Error ? error.message : String(error) });
        continue;
      }

      await prisma.$transaction([
        prisma.lead.update({ where: { id: lead.id }, data: { draftMessage: message, draftStatus: "PENDING_APPROVAL", needsHumanReview: true } }),
        prisma.leadMessage.create({ data: { leadId: lead.id, direction: "OUTBOUND", body: message, status: "PENDING_APPROVAL" } })
      ]);
      drafted++;
    }

    logger.info("Follow-up scheduler run complete.", { drafted, candidatesConsidered: candidates.length });
    return { drafted };
  }
});
