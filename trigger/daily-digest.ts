import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "../lib/prisma";
import { sendWhatsAppMessage } from "./lib/whatsapp-bridge";

// A factual daily count doesn't need AI to write it — templating it directly
// is more reliable (no risk of the model inventing or rounding numbers) and
// costs nothing to run.
export const dailyDigest = schedules.task({
  id: "daily-digest",
  cron: { pattern: "0 19 * * *", timezone: "Africa/Casablanca" }, // 19h chaque soir
  run: async () => {
    const ownerPhone = process.env.OWNER_WHATSAPP_NUMBER;
    if (!ownerPhone) {
      logger.warn("OWNER_WHATSAPP_NUMBER is not configured — skipping digest send.");
      return { sent: false };
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [sourcedToday, pendingApproval, repliedToday, needsReview, pilotsRequested] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: since }, leadSource: "AI_SOURCING" } }),
      prisma.lead.count({ where: { draftStatus: "PENDING_APPROVAL" } }),
      prisma.leadMessage.count({ where: { direction: "INBOUND", createdAt: { gte: since } } }),
      prisma.lead.findMany({ where: { needsHumanReview: true }, select: { firmName: true }, take: 10 }),
      prisma.lead.count({ where: { stage: "PILOT_PROPOSED" } })
    ]);

    const lines = [
      "📊 Résumé du jour — TVA Collect",
      "",
      `${sourcedToday} nouveau(x) cabinet(s) trouvé(s)`,
      `${repliedToday} réponse(s) reçue(s) aujourd'hui`,
      `${pendingApproval} message(s) en attente de votre validation`,
      `${pilotsRequested} cabinet(s) prêt(s) à devenir pilote`
    ];
    if (needsReview.length) {
      lines.push("", "À traiter :", ...needsReview.map((l) => `• ${l.firmName || "(sans nom)"}`));
    }

    await sendWhatsAppMessage(ownerPhone, lines.join("\n"));
    logger.info("Daily digest sent.", { sourcedToday, pendingApproval, repliedToday, pilotsRequested });
    return { sent: true };
  }
});
