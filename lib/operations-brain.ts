import { ClientCollectionStatus, DocumentQualityStatus, RequiredDocumentStatus } from "@prisma/client";
import { workflowDeadline } from "@/lib/tva";

type OperationClientCollection = {
  id: string;
  status: ClientCollectionStatus;
  createdAt: Date;
  updatedAt: Date;
  completionConfirmedAt?: Date | null;
  clientId: string;
  collectionPeriodId: string;
  client: { companyName: string; phone?: string | null; email?: string | null };
  collectionPeriod: { name: string; month: number; year: number; workflowType?: string | null };
  requiredDocuments: { name: string; status: RequiredDocumentStatus; isRequired: boolean }[];
  uploadedDocuments: { id: string; originalFileName: string; createdAt: Date; qualityStatus: DocumentQualityStatus }[];
  reminderLogs: { createdAt: Date; channel?: string | null }[];
};

export type OperationActionType =
  | "SEND_FIRST_REQUEST"
  | "SEND_REMINDER"
  | "SEND_URGENT_REMINDER"
  | "CALL_CLIENT"
  | "ESCALATE"
  | "REVIEW_DOCUMENT"
  | "REQUEST_REUPLOAD"
  | "CLOSE_DOSSIER"
  | "WAIT";

export type OperationRecommendation = {
  itemId: string;
  clientId: string;
  collectionId: string;
  clientName: string;
  collectionName: string;
  actionType: OperationActionType;
  actionLabel: string;
  reason: string;
  confidence: "Low" | "Medium" | "High" | "Critical";
  priority: number;
  estimatedMinutes: number;
  missingCount: number;
  pendingReviewCount: number;
  invalidCount: number;
  reminderCount: number;
  daysRemaining: number;
  href: string;
  section: "morning" | "afternoon" | "endOfDay";
};

type OperationsPlanInput = {
  clientCollections: OperationClientCollection[];
  complianceScoresByClientId?: Map<string, number>;
  dailyCapacityMinutes?: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysUntil(deadline: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function oldestAgeDays(dates: Date[]) {
  if (!dates.length) return 0;
  const oldest = dates.reduce((current, date) => (date.getTime() < current.getTime() ? date : current), dates[0]);
  return Math.max(0, Math.ceil((Date.now() - oldest.getTime()) / 86400000));
}

function confidenceFrom(priority: number): OperationRecommendation["confidence"] {
  if (priority >= 90) return "Critical";
  if (priority >= 70) return "High";
  if (priority >= 45) return "Medium";
  return "Low";
}

function sectionFrom(actionType: OperationActionType, priority: number): OperationRecommendation["section"] {
  if (priority >= 70 || actionType === "REVIEW_DOCUMENT" || actionType === "REQUEST_REUPLOAD") return "morning";
  if (actionType === "CLOSE_DOSSIER") return "endOfDay";
  return "afternoon";
}

function estimateMinutes(actionType: OperationActionType, pendingReviewCount: number, invalidCount: number) {
  if (actionType === "REVIEW_DOCUMENT") return Math.max(3, pendingReviewCount * 3);
  if (actionType === "REQUEST_REUPLOAD") return Math.max(5, invalidCount * 5);
  if (actionType === "CALL_CLIENT") return 8;
  if (actionType === "ESCALATE") return 10;
  if (actionType === "CLOSE_DOSSIER") return 4;
  if (actionType === "WAIT") return 0;
  return 4;
}

export function buildNextBestAction(item: OperationClientCollection, complianceScore = 70): OperationRecommendation {
  const missing = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === RequiredDocumentStatus.MISSING);
  const pendingReviews = item.uploadedDocuments.filter((doc) => doc.qualityStatus === DocumentQualityStatus.UNREVIEWED);
  const invalidDocs = item.uploadedDocuments.filter((doc) => doc.qualityStatus !== DocumentQualityStatus.UNREVIEWED && doc.qualityStatus !== DocumentQualityStatus.VALID);
  const deadline = workflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const daysRemaining = daysUntil(deadline);
  const reminderCount = item.reminderLogs.length;
  const oldestPendingReviewDays = oldestAgeDays(pendingReviews.map((doc) => doc.createdAt));

  let actionType: OperationActionType = "WAIT";
  let actionLabel = "Attendre";
  let reason = "Aucune action urgente detectee.";

  if (invalidDocs.length) {
    actionType = "REQUEST_REUPLOAD";
    actionLabel = "Demander un remplacement";
    reason = `${invalidDocs.length} document(s) invalide(s) doivent etre corriges.`;
  } else if (pendingReviews.length) {
    actionType = "REVIEW_DOCUMENT";
    actionLabel = "Verifier les documents";
    reason = `${pendingReviews.length} document(s) attendent le controle cabinet.`;
  } else if (item.status === ClientCollectionStatus.COMPLETE && item.completionConfirmedAt) {
    actionType = "CLOSE_DOSSIER";
    actionLabel = "Cloturer le dossier";
    reason = "Le dossier est complet et le client a confirme l'envoi des documents disponibles.";
  } else if (missing.length && (daysRemaining <= 2 || reminderCount >= 3 || complianceScore < 35)) {
    actionType = daysRemaining <= 0 || reminderCount >= 4 ? "ESCALATE" : "CALL_CLIENT";
    actionLabel = actionType === "ESCALATE" ? "Escalader au manager" : "Appeler le client";
    reason = `${missing.length} document(s) manquant(s), ${reminderCount} relance(s), echeance ${daysRemaining <= 0 ? "depassee" : `dans ${daysRemaining} jour(s)`}.`;
  } else if (missing.length && (daysRemaining <= 7 || complianceScore < 60)) {
    actionType = "SEND_URGENT_REMINDER";
    actionLabel = "Envoyer une relance urgente";
    reason = `${missing.length} document(s) manquant(s) et risque de retard.`;
  } else if (missing.length && reminderCount === 0) {
    actionType = "SEND_FIRST_REQUEST";
    actionLabel = "Envoyer la premiere relance";
    reason = `${missing.length} document(s) manquant(s) et aucune relance generee.`;
  } else if (missing.length) {
    actionType = "SEND_REMINDER";
    actionLabel = "Envoyer une relance";
    reason = `${missing.length} document(s) encore manquant(s).`;
  }

  const deadlinePressure = daysRemaining <= 0 ? 35 : daysRemaining <= 2 ? 30 : daysRemaining <= 5 ? 22 : daysRemaining <= 10 ? 12 : 4;
  const priority = clamp(
    deadlinePressure +
      missing.length * 7 +
      pendingReviews.length * 8 +
      invalidDocs.length * 12 +
      reminderCount * 5 +
      oldestPendingReviewDays * 4 +
      Math.max(0, 70 - complianceScore) * 0.45 +
      (actionType === "ESCALATE" ? 18 : 0) +
      (actionType === "CLOSE_DOSSIER" ? 20 : 0)
  );
  const estimatedMinutes = estimateMinutes(actionType, pendingReviews.length, invalidDocs.length);

  return {
    itemId: item.id,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientName: item.client.companyName,
    collectionName: item.collectionPeriod.name,
    actionType,
    actionLabel,
    reason,
    confidence: confidenceFrom(priority),
    priority,
    estimatedMinutes,
    missingCount: missing.length,
    pendingReviewCount: pendingReviews.length,
    invalidCount: invalidDocs.length,
    reminderCount,
    daysRemaining,
    href: `/app/collections/${item.collectionPeriodId}`,
    section: sectionFrom(actionType, priority)
  };
}

export function buildOperationsPlan({
  clientCollections,
  complianceScoresByClientId = new Map(),
  dailyCapacityMinutes = 6 * 60
}: OperationsPlanInput) {
  const recommendations = clientCollections
    .map((item) => buildNextBestAction(item, complianceScoresByClientId.get(item.clientId) ?? 70))
    .filter((item) => item.actionType !== "WAIT")
    .sort((a, b) => b.priority - a.priority);

  const totalMinutes = recommendations.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const critical = recommendations.filter((item) => item.confidence === "Critical").length;
  const overloadMinutes = Math.max(0, totalMinutes - dailyCapacityMinutes);
  const grouped = {
    morning: recommendations.filter((item) => item.section === "morning").slice(0, 10),
    afternoon: recommendations.filter((item) => item.section === "afternoon").slice(0, 10),
    endOfDay: recommendations.filter((item) => item.section === "endOfDay").slice(0, 10)
  };

  const recoveryActions = [
    critical ? `Traiter ${critical} action(s) critique(s) en premier.` : null,
    recommendations.some((item) => item.actionType === "REVIEW_DOCUMENT") ? "Controler les documents en attente avant de relancer les clients." : null,
    recommendations.some((item) => item.actionType === "CALL_CLIENT" || item.actionType === "ESCALATE")
      ? "Appeler ou escalader les clients critiques avant les relances simples."
      : null,
    overloadMinutes ? "Reporter les relances de faible priorite ou demander renfort manager." : null
  ].filter((item): item is string => Boolean(item));

  return {
    recommendations,
    grouped,
    totalMinutes,
    dailyCapacityMinutes,
    overloadMinutes,
    critical,
    recoveryActions
  };
}
