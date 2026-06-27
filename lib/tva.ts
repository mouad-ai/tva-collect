import { ClientCollectionStatus, RequiredDocumentStatus, ReminderChannel } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { uploadUrl } from "@/lib/utils";

type ReminderInput = {
  clientName: string;
  firmName: string;
  month: number;
  year: number;
  uploadToken: string;
  missingDocuments: string[];
  workflowType?: string | null;
  template?: string | null;
};

export function generateUploadToken() {
  return `cl_${randomUUID().replaceAll("-", "")}${randomUUID().slice(0, 8)}`;
}

export function statusLabel(status: ClientCollectionStatus) {
  return {
    NOT_STARTED: "Non commence",
    IN_PROGRESS: "En cours",
    MISSING: "Documents manquants",
    COMPLETE: "Dossier complet"
  }[status];
}

export function collectionStatusLabel(status: string) {
  return {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    CLOSED: "Fermee"
  }[status] || status;
}

export function generateReminderMessage(input: ReminderInput, channel: ReminderChannel = "WHATSAPP") {
  const missing = input.missingDocuments.length
    ? input.missingDocuments.map((name) => `- ${name}`).join("\n")
    : "- Aucun document manquant";
  const monthYear = `${monthNames[input.month - 1]} ${input.year}`;
  const workflowLabel = workflowTemplateFromType(input.workflowType).label;
  const link = uploadUrl(input.uploadToken);

  if (input.template && channel === "WHATSAPP") {
    return input.template
      .replaceAll("[Client]", input.clientName)
      .replaceAll("[Month Year]", monthYear)
      .replaceAll("[Workflow]", workflowLabel)
      .replaceAll("[Missing documents]", missing)
      .replaceAll("[Upload Link]", link)
      .replaceAll("[Firm Name]", input.firmName);
  }

  if (channel === "EMAIL") {
    return `Bonjour ${input.clientName},\n\nPetit rappel pour ${workflowLabel} ${monthYear}.\n\nIl nous manque encore les documents suivants :\n\n${missing}\n\nMerci de les deposer ici :\n${link}\n\nCordialement,\nCabinet ${input.firmName}`;
  }

  return `Bonjour ${input.clientName},\n\nPetit rappel pour ${workflowLabel} ${monthYear}.\n\nIl nous manque encore les documents suivants :\n\n${missing}\n\nMerci de les deposer ici :\n${link}\n\nCabinet ${input.firmName}`;
}

export async function recalculateClientCollectionStatus(clientCollectionId: string) {
  const clientCollection = await prisma.clientCollection.findUnique({
    where: { id: clientCollectionId },
    include: {
      requiredDocuments: true,
      uploadedDocuments: true
    }
  });

  if (!clientCollection) return null;

  const uploads = clientCollection.uploadedDocuments.length;
  const requiredDocs = clientCollection.requiredDocuments.filter((doc) => doc.isRequired);
  const missingRequired = requiredDocs.filter((doc) => doc.status === RequiredDocumentStatus.MISSING);
  const unclassifiedUploads = clientCollection.uploadedDocuments.some((doc) => !doc.requiredDocumentId);

  let status: ClientCollectionStatus = ClientCollectionStatus.NOT_STARTED;
  if (uploads === 0) status = ClientCollectionStatus.NOT_STARTED;
  else if (missingRequired.length === 0) status = ClientCollectionStatus.COMPLETE;
  else if (unclassifiedUploads) status = ClientCollectionStatus.IN_PROGRESS;
  else status = ClientCollectionStatus.MISSING;

  return prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { status }
  });
}

export function missingDocuments(requiredDocuments: { name: string; status: RequiredDocumentStatus; isRequired: boolean }[]) {
  return requiredDocuments
    .filter((doc) => doc.isRequired && doc.status === RequiredDocumentStatus.MISSING)
    .map((doc) => doc.name);
}

export function receivedDocuments(requiredDocuments: { name: string; status: RequiredDocumentStatus }[]) {
  return requiredDocuments.filter((doc) => doc.status === RequiredDocumentStatus.RECEIVED).map((doc) => doc.name);
}

export function tvaDeadline(year: number, month: number) {
  return new Date(year, month, 20, 12, 0, 0, 0);
}

export function workflowDeadline(workflowType: string | null | undefined, year: number, month: number) {
  if (workflowType === "CNSS_MONTHLY" || workflowType === "PAYROLL") {
    return new Date(year, month, 10, 12, 0, 0, 0);
  }
  if (workflowType === "ANNUAL_CLOSING") {
    return new Date(year + 1, 2, 31, 12, 0, 0, 0);
  }
  if (workflowType === "CLIENT_ONBOARDING" || workflowType === "CUSTOM") {
    return new Date(year, month, 0, 12, 0, 0, 0);
  }
  return tvaDeadline(year, month);
}

export function daysUntilTvaDeadline(year: number, month: number, now = new Date()) {
  const deadline = tvaDeadline(year, month);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function daysUntilWorkflowDeadline(workflowType: string | null | undefined, year: number, month: number, now = new Date()) {
  const deadline = workflowDeadline(workflowType, year, month);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function deadlineCountdownLabel(daysRemaining: number) {
  if (daysRemaining > 1) return `${daysRemaining} jours restants`;
  if (daysRemaining === 1) return "Demain";
  if (daysRemaining === 0) return "Echeance aujourd'hui";
  if (daysRemaining === -1) return "1 jour en retard";
  return `${Math.abs(daysRemaining)} jours en retard`;
}

export type DeadlineRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function deadlineRiskLabel(risk: DeadlineRisk) {
  return {
    LOW: "Risque faible",
    MEDIUM: "Risque moyen",
    HIGH: "Risque eleve",
    CRITICAL: "Critique"
  }[risk];
}

export function collectionCloseRisk({
  daysRemaining,
  totalClients,
  incompleteClients,
  invalidDocuments = 0
}: {
  daysRemaining: number;
  totalClients: number;
  incompleteClients: number;
  invalidDocuments?: number;
}): DeadlineRisk {
  if (!totalClients || !incompleteClients && !invalidDocuments) return "LOW";

  const incompleteRatio = incompleteClients / totalClients;
  if (daysRemaining < 0 && (incompleteClients || invalidDocuments)) return "CRITICAL";
  if (daysRemaining <= 3 && (incompleteClients || invalidDocuments)) return "CRITICAL";
  if (daysRemaining <= 7 && (incompleteRatio >= 0.25 || invalidDocuments > 0)) return "HIGH";
  if (daysRemaining <= 14 && incompleteClients > 0) return "MEDIUM";
  if (incompleteRatio >= 0.5) return "MEDIUM";
  return "LOW";
}

export function clientCloseRisk({
  daysRemaining,
  status,
  missingDocumentsCount,
  invalidDocumentsCount,
  uploadCount
}: {
  daysRemaining: number;
  status: ClientCollectionStatus;
  missingDocumentsCount: number;
  invalidDocumentsCount: number;
  uploadCount: number;
}): { risk: DeadlineRisk; nextAction: string } {
  if (status === ClientCollectionStatus.COMPLETE && invalidDocumentsCount === 0) {
    return { risk: "LOW", nextAction: "Pret a cloturer" };
  }

  if (invalidDocumentsCount > 0) {
    const risk = daysRemaining <= 7 ? "CRITICAL" : "HIGH";
    return { risk, nextAction: "Corriger les documents invalides" };
  }

  if (uploadCount === 0) {
    const risk = daysRemaining <= 3 ? "CRITICAL" : daysRemaining <= 7 ? "HIGH" : "MEDIUM";
    return { risk, nextAction: "Relancer le client" };
  }

  if (missingDocumentsCount > 0) {
    const risk = daysRemaining <= 3 ? "CRITICAL" : daysRemaining <= 7 ? "HIGH" : "MEDIUM";
    return { risk, nextAction: "Demander les pieces manquantes" };
  }

  return { risk: "MEDIUM", nextAction: "Verifier les derniers depots" };
}
