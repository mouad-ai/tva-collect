type SalesLead = {
  numberOfClients?: number | null;
  numberOfAssistants?: number | null;
  currentWorkflow?: string | null;
  painLevel?: string | null;
  stage?: string | null;
  expectedPlan?: string | null;
  expectedSetupFee?: number | null;
  biggestProblem?: string | null;
  message?: string | null;
  nextFollowUpAt?: Date | null;
  preferredDemoAt?: Date | null;
};

export const leadStages = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "DEMO_SCHEDULED", label: "Demo scheduled" },
  { value: "DEMO_DONE", label: "Demo done" },
  { value: "PILOT_PROPOSED", label: "Pilot proposed" },
  { value: "PILOT_ACTIVE", label: "Pilot active" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "NURTURE", label: "Nurture" }
];

export const planPrices = {
  Starter: 999,
  Pro: 1999,
  Premium: 0
};

function textIncludes(value: string | null | undefined, terms: string[]) {
  const text = `${value || ""}`.toLowerCase();
  return terms.some((term) => text.includes(term));
}

export function leadQualification(lead: SalesLead) {
  const clients = lead.numberOfClients || 0;
  const assistants = lead.numberOfAssistants || 0;
  const text = `${lead.biggestProblem || ""} ${lead.message || ""} ${lead.currentWorkflow || ""}`;
  let score = 20;
  if (clients >= 100) score += 25;
  else if (clients >= 50) score += 20;
  else if (clients >= 30) score += 15;
  else if (clients >= 10) score += 8;
  else score -= 8;
  if (assistants >= 3) score += 15;
  else if (assistants >= 1) score += 8;
  if (textIncludes(text, ["whatsapp", "relance", "retard", "manquant", "perdu", "chaos", "excel"])) score += 20;
  if (textIncludes(text, ["urgent", "deadline", "echeance", "tva"])) score += 10;
  if (lead.painLevel === "HIGH") score += 15;
  if (lead.painLevel === "LOW") score -= 8;
  if (textIncludes(text, ["gratuit", "free", "dgi", "facturation complete", "comptabilite complete"])) score -= 20;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 80 ? "Hot" : score >= 65 ? "Good" : score >= 45 ? "Medium" : score >= 25 ? "Weak" : "Bad fit";
  const tone =
    score >= 65
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : score >= 45
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-800";
  return { score, label, tone };
}

export function pricingRecommendation(lead: SalesLead) {
  const clients = lead.numberOfClients || 0;
  const assistants = lead.numberOfAssistants || 0;
  if (clients > 100 || assistants > 3) {
    return {
      plan: "Premium",
      price: "Custom",
      setupFee: lead.expectedSetupFee || 5000,
      reason: "Volume eleve, besoin probable de multi-utilisateurs, workflow avance ou accompagnement premium."
    };
  }
  if (clients > 30 || assistants > 1 || textIncludes(lead.currentWorkflow, ["cnss", "paie", "cloture", "multi"])) {
    return {
      plan: "Pro",
      price: "1 999 MAD/mois",
      setupFee: lead.expectedSetupFee || 2000,
      reason: "Cabinet assez structure pour Pro: plus de clients, assistants, exports et templates."
    };
  }
  return {
    plan: "Starter",
    price: "999 MAD/mois",
    setupFee: lead.expectedSetupFee || 1000,
    reason: "Bon demarrage pour piloter une premiere collecte TVA avec un petit portefeuille."
  };
}

export function demoScriptForLead(lead: SalesLead) {
  const qualification = leadQualification(lead);
  const pricing = pricingRecommendation(lead);
  const pain = lead.biggestProblem || lead.message || "documents eparpilles et relances difficiles";
  return [
    `Ouvrir avec leur probleme: ${pain}.`,
    "Montrer import clients et creation d'une collecte TVA.",
    "Ouvrir un lien public client sur mobile.",
    "Montrer documents manquants, statut client et relances WhatsApp.",
    "Montrer Work Queue et Operations du jour pour l'assistant.",
    "Montrer rapports, valeur estimee et preuve d'activite.",
    qualification.score >= 65
      ? `Clore avec offre pilote payant puis plan ${pricing.plan}.`
      : "Clore avec mini-pilote 5 clients pour valider l'urgence."
  ];
}

export function salesFollowUpMessage(lead: SalesLead & { name?: string | null; firmName?: string | null }) {
  const pricing = pricingRecommendation(lead);
  const name = lead.name || "Bonjour";
  if (lead.stage === "DEMO_SCHEDULED") {
    return `${name}, merci pour votre demande. Pendant la demo, je vous montrerai comment passer des relances WhatsApp au suivi controle des documents TVA.`;
  }
  if (lead.stage === "PILOT_PROPOSED" || lead.stage === "PILOT_ACTIVE") {
    return `${name}, je vous propose de mesurer le pilote sur 30 jours: clients importes, documents recus, relances generees et temps gagne. Offre recommandee ensuite: ${pricing.plan}.`;
  }
  if (lead.stage === "DEMO_DONE") {
    return `${name}, suite a notre demo, le meilleur prochain pas est un pilote payant avec ${pricing.setupFee} MAD de setup et le plan ${pricing.plan}.`;
  }
  return `${name}, TVA Collect aide votre cabinet a centraliser les depots, suivre les manquants et reduire les relances WhatsApp. On peut demarrer avec un pilote controle.`;
}

export function isFollowUpOverdue(lead: SalesLead, now = new Date()) {
  return Boolean(lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < now.getTime() && !["WON", "LOST"].includes(lead.stage || ""));
}
