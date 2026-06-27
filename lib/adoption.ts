type AdoptionInput = {
  clients: number;
  totalCollections: number;
  activeCollections: number;
  uploadLinks: number;
  documentsUploaded: number;
  remindersGenerated: number;
  exportedReports: number;
  closedCollections: number;
  missingDocumentsDetected: number;
  invalidDocumentsDetected: number;
};

export type AdoptionSnapshot = {
  score: number;
  label: string;
  level: {
    number: number;
    name: string;
    description: string;
  };
  nextStep: {
    label: string;
    href: string;
    cta: string;
  };
  milestones: { label: string; done: boolean }[];
  firstMonthTargets: { label: string; value: number | string; target: number | string; done: boolean }[];
  adoptionRisk: {
    level: "Healthy" | "Watch" | "At risk";
    reason: string;
    action: string;
  };
  value: {
    estimatedTimeSavedHours: number;
    estimatedValueMad: number;
    story: string;
  };
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function adoptionLabel(score: number) {
  if (score >= 85) return "Embedded";
  if (score >= 65) return "Strong adoption";
  if (score >= 40) return "Partial adoption";
  if (score >= 20) return "Onboarding";
  return "Not adopted";
}

function transformationLevel(input: AdoptionInput): AdoptionSnapshot["level"] {
  if (input.exportedReports > 0 && input.closedCollections > 0 && input.documentsUploaded >= 50) {
    return { number: 5, name: "Operating System", description: "Le cabinet utilise TVA Collect pour piloter, prouver et exporter." };
  }
  if (input.exportedReports > 0 || input.closedCollections > 0) {
    return { number: 4, name: "Proof & Reports", description: "Le cabinet commence a produire de la preuve et des rapports." };
  }
  if (input.remindersGenerated > 0 && input.documentsUploaded > 0) {
    return { number: 3, name: "Team Execution", description: "Le travail quotidien commence a passer par l'application." };
  }
  if (input.uploadLinks > 0) {
    return { number: 2, name: "Collection Control", description: "Les liens de depot et le suivi des documents sont en place." };
  }
  return { number: 1, name: "Setup", description: "Le cabinet configure la base: profil, clients et premiere collecte." };
}

function nextStep(input: AdoptionInput): AdoptionSnapshot["nextStep"] {
  if (input.clients < 20) return { label: "Importer au moins 20 clients", href: "/app/clients", cta: "Importer clients" };
  if (!input.totalCollections) return { label: "Creer la premiere collecte", href: "/app/collections", cta: "Creer collecte" };
  if (input.uploadLinks < 10) return { label: "Ajouter des clients a la collecte", href: "/app/collections", cta: "Generer liens" };
  if (input.documentsUploaded < 10) return { label: "Envoyer les liens et recevoir les premiers depots", href: "/app/collections", cta: "Lancer clients" };
  if (input.remindersGenerated < 5) return { label: "Generer les premieres relances", href: "/app/reminders", cta: "Relancer" };
  if (!input.exportedReports) return { label: "Exporter le premier rapport", href: "/app/reports", cta: "Exporter" };
  if (!input.closedCollections) return { label: "Cloturer une collecte proprement", href: "/app/collections", cta: "Voir collectes" };
  return { label: "Installer l'habitude du Work Queue", href: "/app/work-queue", cta: "Voir mission" };
}

export function buildAdoptionSnapshot(input: AdoptionInput): AdoptionSnapshot {
  const milestones = [
    { label: "Premier cabinet configure", done: true },
    { label: "10 clients importes", done: input.clients >= 10 },
    { label: "Premiere collecte creee", done: input.totalCollections > 0 },
    { label: "10 liens de depot generes", done: input.uploadLinks >= 10 },
    { label: "Premier document recu", done: input.documentsUploaded > 0 },
    { label: "50 documents collectes", done: input.documentsUploaded >= 50 },
    { label: "Premier rapport exporte", done: input.exportedReports > 0 },
    { label: "Premiere collecte cloturee", done: input.closedCollections > 0 }
  ];
  const firstMonthTargets = [
    { label: "Clients importes", value: input.clients, target: 20, done: input.clients >= 20 },
    { label: "Collecte lancee", value: input.totalCollections ? "oui" : "non", target: "oui", done: input.totalCollections > 0 },
    { label: "Liens generes", value: input.uploadLinks, target: 10, done: input.uploadLinks >= 10 },
    { label: "Documents recus", value: input.documentsUploaded, target: 10, done: input.documentsUploaded >= 10 },
    { label: "Relances generees", value: input.remindersGenerated, target: 5, done: input.remindersGenerated >= 5 },
    { label: "Rapport exporte", value: input.exportedReports ? "oui" : "non", target: "oui", done: input.exportedReports > 0 },
    { label: "Collecte cloturee", value: input.closedCollections ? "oui" : "non", target: "oui", done: input.closedCollections > 0 }
  ];
  const score = clamp(
    (input.clients >= 20 ? 15 : input.clients * 0.7) +
      (input.totalCollections > 0 ? 15 : 0) +
      Math.min(8, input.activeCollections * 4) +
      Math.min(15, input.uploadLinks * 1.5) +
      Math.min(20, input.documentsUploaded * 1.2) +
      Math.min(12, input.remindersGenerated * 2) +
      (input.exportedReports > 0 ? 10 : 0) +
      (input.closedCollections > 0 ? 13 : 0)
  );
  const risk =
    input.totalCollections === 0
      ? { level: "At risk" as const, reason: "Aucune collecte n'a encore ete creee.", action: "Aider le cabinet a lancer une premiere collecte." }
      : input.documentsUploaded === 0 && input.uploadLinks > 0
        ? { level: "Watch" as const, reason: "Des liens existent mais aucun client n'a encore depose.", action: "Envoyer le message de lancement et relancer les liens non ouverts." }
        : input.clients >= 20 && input.uploadLinks < 10
          ? { level: "Watch" as const, reason: "Les clients sont importes mais les liens ne sont pas encore assez diffuses.", action: "Lancer la campagne de migration client." }
          : { level: "Healthy" as const, reason: "Le cabinet progresse dans l'adoption.", action: "Continuer la routine: liens, relances, controles, exports." };

  const savedMinutes =
    input.remindersGenerated * 4 +
    input.documentsUploaded * 5 +
    input.missingDocumentsDetected * 6 +
    input.invalidDocumentsDetected * 5 +
    input.exportedReports * 10;
  const estimatedTimeSavedHours = Math.round((savedMinutes / 60) * 10) / 10;
  const estimatedValueMad = Math.round(estimatedTimeSavedHours * 100);

  return {
    score,
    label: adoptionLabel(score),
    level: transformationLevel(input),
    nextStep: nextStep(input),
    milestones,
    firstMonthTargets,
    adoptionRisk: risk,
    value: {
      estimatedTimeSavedHours,
      estimatedValueMad,
      story: `Ce mois-ci, TVA Collect a aide votre cabinet a collecter ${input.documentsUploaded} document(s), generer ${input.remindersGenerated} relance(s), detecter ${input.missingDocumentsDetected} document(s) manquant(s) et economiser environ ${estimatedTimeSavedHours}h de suivi manuel.`
    }
  };
}
