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
  { value: "NEW", label: "Nouveau" },
  { value: "CONTACTED", label: "Contacte" },
  { value: "QUALIFIED", label: "Qualifie" },
  { value: "DEMO_SCHEDULED", label: "Demo planifiee" },
  { value: "DEMO_DONE", label: "Demo realisee" },
  { value: "PILOT_PROPOSED", label: "Pilote propose" },
  { value: "PILOT_ACTIVE", label: "Pilote actif" },
  { value: "WON", label: "Gagne" },
  { value: "LOST", label: "Perdu" },
  { value: "NURTURE", label: "A nourrir" }
];

export const planPrices = {
  Starter: 399,
  Pro: 799,
  Premium: 1490
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
  const label = score >= 80 ? "Tres chaud" : score >= 65 ? "Bon" : score >= 45 ? "Moyen" : score >= 25 ? "Faible" : "Peu adapte";
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
  if (clients > 75 || assistants > 3) {
    return {
      plan: "Cabinet Plus",
      price: "1 490 MAD/mois",
      setupFee: lead.expectedSetupFee || 2000,
      reason: "Volume eleve, besoin de plus d'utilisateurs, stockage, workflows ou accompagnement prioritaire."
    };
  }
  if (clients > 20 || assistants > 1 || textIncludes(lead.currentWorkflow, ["cnss", "paie", "cloture", "multi"])) {
    return {
      plan: "Professionnel",
      price: "799 MAD/mois",
      setupFee: lead.expectedSetupFee || 1000,
      reason: "Meilleur equilibre pour un cabinet actif: plusieurs utilisateurs, exports, rapports et plus de clients."
    };
  }
  return {
    plan: "Essentiel",
    price: "399 MAD/mois",
    setupFee: lead.expectedSetupFee || 500,
    reason: "Bon demarrage pour un petit cabinet qui veut sortir de WhatsApp sans gros engagement."
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
  const plan = pricing.plan;
  const name = lead.name || "Bonjour";
  if (lead.stage === "DEMO_SCHEDULED") {
    return `${name}, merci pour votre demande. Pendant la demo, je vous montrerai comment passer des relances WhatsApp au suivi controle des documents TVA.`;
  }
  if (lead.stage === "PILOT_PROPOSED" || lead.stage === "PILOT_ACTIVE") {
    return `${name}, je vous propose de mesurer le pilote sur 30 jours: clients importes, documents recus, relances generees et temps gagne. Offre recommandee ensuite: ${plan}.`;
  }
  if (lead.stage === "DEMO_DONE") {
    return `${name}, suite a notre demo, le meilleur prochain pas est un pilote payant avec ${pricing.setupFee} MAD de mise en place et le plan ${plan}.`;
  }
  return `${name}, TVA Collect aide votre cabinet a centraliser les depots, suivre les manquants et reduire les relances WhatsApp. On peut demarrer avec un pilote controle.`;
}

export function isFollowUpOverdue(lead: SalesLead, now = new Date()) {
  return Boolean(lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < now.getTime() && !["WON", "LOST"].includes(lead.stage || ""));
}
