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
    label: string;
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
  if (score >= 85) return "Adoption installée";
  if (score >= 65) return "Adoption forte";
  if (score >= 40) return "Adoption partielle";
  if (score >= 20) return "Configuration";
  return "Non adopté";
}

function transformationLevel(input: AdoptionInput): AdoptionSnapshot["level"] {
  if (input.exportedReports > 0 && input.closedCollections > 0 && input.documentsUploaded >= 50) {
    return { number: 5, name: "Système opérationnel", description: "Le cabinet utilise TVA Collect pour piloter, prouver et exporter." };
  }
  if (input.exportedReports > 0 || input.closedCollections > 0) {
    return { number: 4, name: "Preuves et rapports", description: "Le cabinet commence à produire de la preuve et des rapports." };
  }
  if (input.remindersGenerated > 0 && input.documentsUploaded > 0) {
    return { number: 3, name: "Exécution équipe", description: "Le travail quotidien commence à passer par l'application." };
  }
  if (input.uploadLinks > 0) {
    return { number: 2, name: "Contrôle collecte", description: "Les liens de dépôt et le suivi des documents sont en place." };
  }
  return { number: 1, name: "Configuration", description: "Le cabinet configure la base : profil, clients et première collecte." };
}

function nextStep(input: AdoptionInput): AdoptionSnapshot["nextStep"] {
  if (input.clients < 20) return { label: "Importer au moins 20 clients", href: "/app/clients", cta: "Importer clients" };
  if (!input.totalCollections) return { label: "Créer la première collecte", href: "/app/collections", cta: "Créer collecte" };
  if (input.uploadLinks < 10) return { label: "Ajouter des clients à la collecte", href: "/app/collections", cta: "Générer liens" };
  if (input.documentsUploaded < 10) return { label: "Envoyer les liens et recevoir les premiers dépôts", href: "/app/collections", cta: "Lancer clients" };
  if (input.remindersGenerated < 5) return { label: "Générer les premières relances", href: "/app/reminders", cta: "Relancer" };
  if (!input.exportedReports) return { label: "Exporter le premier rapport", href: "/app/reports", cta: "Exporter" };
  if (!input.closedCollections) return { label: "Clôturer une collecte proprement", href: "/app/collections", cta: "Voir collectes" };
  return { label: "Installer l'habitude de la file de travail", href: "/app/work-queue", cta: "Voir mission" };
}

const riskLabels: Record<AdoptionSnapshot["adoptionRisk"]["level"], string> = {
  Healthy: "Sain",
  Watch: "À surveiller",
  "At risk": "À risque"
};

export function buildAdoptionSnapshot(input: AdoptionInput): AdoptionSnapshot {
  const milestones = [
    { label: "Premier cabinet configuré", done: true },
    { label: "10 clients importés", done: input.clients >= 10 },
    { label: "Première collecte créée", done: input.totalCollections > 0 },
    { label: "10 liens de dépôt générés", done: input.uploadLinks >= 10 },
    { label: "Premier document reçu", done: input.documentsUploaded > 0 },
    { label: "50 documents collectés", done: input.documentsUploaded >= 50 },
    { label: "Premier rapport exporté", done: input.exportedReports > 0 },
    { label: "Première collecte clôturée", done: input.closedCollections > 0 }
  ];
  const firstMonthTargets = [
    { label: "Clients importés", value: input.clients, target: 20, done: input.clients >= 20 },
    { label: "Collecte lancée", value: input.totalCollections ? "oui" : "non", target: "oui", done: input.totalCollections > 0 },
    { label: "Liens générés", value: input.uploadLinks, target: 10, done: input.uploadLinks >= 10 },
    { label: "Documents reçus", value: input.documentsUploaded, target: 10, done: input.documentsUploaded >= 10 },
    { label: "Relances générées", value: input.remindersGenerated, target: 5, done: input.remindersGenerated >= 5 },
    { label: "Rapport exporté", value: input.exportedReports ? "oui" : "non", target: "oui", done: input.exportedReports > 0 },
    { label: "Collecte clôturée", value: input.closedCollections ? "oui" : "non", target: "oui", done: input.closedCollections > 0 }
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
  const riskLevel: AdoptionSnapshot["adoptionRisk"]["level"] =
    input.totalCollections === 0
      ? "At risk"
      : input.documentsUploaded === 0 && input.uploadLinks > 0
        ? "Watch"
        : input.clients >= 20 && input.uploadLinks < 10
          ? "Watch"
          : "Healthy";
  const risk =
    riskLevel === "At risk"
      ? { level: riskLevel, reason: "Aucune collecte n'a encore été créée.", action: "Aider le cabinet à lancer une première collecte." }
      : riskLevel === "Watch" && input.documentsUploaded === 0
        ? { level: riskLevel, reason: "Des liens existent mais aucun client n'a encore déposé.", action: "Envoyer le message de lancement et relancer les liens non ouverts." }
        : riskLevel === "Watch"
          ? { level: riskLevel, reason: "Les clients sont importés mais les liens ne sont pas encore assez diffusés.", action: "Lancer la campagne de migration client." }
          : { level: riskLevel, reason: "Le cabinet progresse dans l'adoption.", action: "Continuer la routine : liens, relances, contrôles, exports." };

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
    adoptionRisk: { ...risk, label: riskLabels[risk.level] },
    value: {
      estimatedTimeSavedHours,
      estimatedValueMad,
      story: `Ce mois-ci, TVA Collect a aidé votre cabinet à collecter ${input.documentsUploaded} document(s), générer ${input.remindersGenerated} relance(s), détecter ${input.missingDocumentsDetected} document(s) manquant(s) et économiser environ ${estimatedTimeSavedHours}h de suivi manuel.`
    }
  };
}
