import { FirmStatus, UserRole } from "@prisma/client";

export function roleLabel(role: UserRole | string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrateur SaaS",
    OWNER: "Proprietaire",
    MANAGER: "Responsable",
    ASSISTANT: "Assistant",
    READ_ONLY: "Lecture seule"
  };
  return labels[String(role)] || String(role);
}

export function firmStatusLabel(status: FirmStatus | string) {
  const labels: Record<string, string> = {
    TRIAL: "Essai",
    ACTIVE: "Actif",
    OVERDUE: "En retard",
    SUSPENDED: "Suspendu",
    CANCELLED_BUT_ACTIVE: "Annule - actif",
    CANCELLED: "Annule"
  };
  return labels[String(status)] || String(status);
}

export function planLabel(plan: string) {
  const labels: Record<string, string> = {
    STARTER: "Essentiel",
    Starter: "Essentiel",
    PRO: "Professionnel",
    Pro: "Professionnel",
    PREMIUM: "Cabinet Plus",
    Premium: "Cabinet Plus"
  };
  return labels[plan] || plan;
}

export function collectionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    CLOSED: "Fermee"
  };
  return labels[status] || status;
}

export function documentQualityLabel(status: string) {
  const labels: Record<string, string> = {
    UNREVIEWED: "A verifier",
    VALID: "Valide",
    WRONG_DOCUMENT: "Mauvais document",
    UNREADABLE: "Illisible",
    DUPLICATE: "Doublon",
    MISSING_PAGE: "Page manquante",
    NOT_TVA: "Hors TVA"
  };
  return labels[status] || status;
}
