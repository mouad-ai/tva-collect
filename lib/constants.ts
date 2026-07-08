export const supportEmail = process.env.SUPPORT_EMAIL || "contact@tvacollect.com";

export const defaultRequiredDocuments = [
  "Factures d'achat",
  "Factures de vente",
  "Rélevé bancaire",
  "Justificatifs de caisse",
  "Notes de frais",
  "Avoirs",
  "Autres documents TVA"
];

export const workflowTemplates = [
  {
    type: "TVA_MONTHLY",
    label: "TVA mensuelle",
    description: "Collecte TVA standard pour factures, rélevés et justificatifs.",
    documents: defaultRequiredDocuments
  },
  {
    type: "TVA_QUARTERLY",
    label: "TVA trimestrielle",
    description: "Collecte TVA trimestrielle avec la meme base documentaire.",
    documents: defaultRequiredDocuments
  },
  {
    type: "CNSS_MONTHLY",
    label: "CNSS / Paie",
    description: "Elements mensuels de paie et declarations sociales.",
    documents: [
      "Nouveaux salaries",
      "Departs salaries",
      "Absences",
      "Conges",
      "Heures supplementaires",
      "Elements variables de paie",
      "Justificatif paiement CNSS"
    ]
  },
  {
    type: "PAYROLL",
    label: "Paie",
    description: "Elements variables, mouvements salaries et justificatifs de paie.",
    documents: [
      "Elements variables de paie",
      "Nouveaux salaries",
      "Departs salaries",
      "Absences",
      "Conges",
      "Primes",
      "Avances sur salaire"
    ]
  },
  {
    type: "ANNUAL_CLOSING",
    label: "Cloture annuelle",
    description: "Documents de clôture, inventaire, banques, clients, fournisseurs et juridique.",
    documents: [
      "Inventaire",
      "Rélevés bancaires annuels",
      "Etat clients",
      "Etat fournisseurs",
      "Immobilisations",
      "Credits / emprunts",
      "Contrats",
      "Documents juridiques",
      "Declaration stock"
    ]
  },
  {
    type: "CLIENT_ONBOARDING",
    label: "Integration client",
    description: "Pieces d'identification et acces necessaires pour demarrer un nouveau client.",
    documents: ["ICE", "RC", "IF", "CNSS", "RIB", "Statuts", "CIN gerant", "Mandat cabinet", "Contact principal", "Acces documents"]
  },
  {
    type: "BANK_DOCUMENTS",
    label: "Documents bancaires",
    description: "Rélevés, attestations et justificatifs bancaires.",
    documents: ["Rélevés bancaires", "Avis de debit", "Avis de credit", "Justificatifs virements", "Attestations bancaires", "RIB"]
  },
  {
    type: "LEGAL_DOCUMENTS",
    label: "Documents juridiques",
    description: "Pieces juridiques, contrats et documents administratifs.",
    documents: ["Statuts", "PV d'assemblee", "Contrats", "Baux", "Autorisations", "Documents administratifs"]
  },
  {
    type: "EMPLOYEE_DOCUMENTS",
    label: "Documents salaries",
    description: "Pieces employees pour paie, dossiers RH et declarations.",
    documents: ["CIN salarie", "Contrat de travail", "RIB salarie", "Attestation CNSS", "Justificatifs absence", "Documents maladie"]
  },
  {
    type: "SUPPLIER_DOCUMENTS",
    label: "Documents fournisseurs",
    description: "Factures, contrats et justificatifs fournisseurs.",
    documents: ["Factures fournisseurs", "Contrats fournisseurs", "Bons de livraison", "Avoirs fournisseurs", "Justificatifs paiement"]
  },
  {
    type: "CUSTOM",
    label: "Workflow personnalise",
    description: "Base personnalisable pour demandes hors TVA.",
    documents: defaultRequiredDocuments
  }
] as const;

export function workflowTemplateFromType(value: unknown) {
  return workflowTemplates.find((template) => template.type === value) || workflowTemplates[0];
}

export function requiredDocumentsFromFirm(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length
    ? value
    : defaultRequiredDocuments;
}

export const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre"
];

export const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx"]);

export const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;

export const clientAcknowledgementText =
  "Je comprends que les documents manquants, incomplets ou envoyes en retard peuvent retarder le traitement de mon dossier.";

export const clientPeriodConfirmationText =
  "Je confirme que les documents déposes concernent bien la période selectionnee.";

export const clientCompletionConfirmationText =
  "Je confirme avoir envoye tous les documents disponibles pour cette période.";

export const clientUploadProofText = `${clientAcknowledgementText}\n${clientPeriodConfirmationText}\n${clientCompletionConfirmationText}`;

export const clientEducationMessages = [
  {
    title: "Pourquoi utiliser ce lien ?",
    body: "Ce portail permet a votre cabinet de suivre les pieces reçues et les documents encore manquants."
  },
  {
    title: "Pourquoi l'échéance compte ?",
    body: "Un dépôt tardif peut retarder le traitement de votre dossier."
  },
  {
    title: "Qualite des fichiers",
    body: "Envoyez des fichiers lisibles, dans la bonne période, et evitez les photos floues ou les documents personnels."
  }
];
