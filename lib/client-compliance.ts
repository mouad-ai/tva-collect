import { ClientCollectionStatus, DocumentQualityStatus, RequiredDocumentStatus } from "@prisma/client";
import { workflowDeadline } from "@/lib/tva";

type ComplianceCollection = {
  id: string;
  status: ClientCollectionStatus;
  createdAt: Date;
  completionConfirmedAt?: Date | null;
  collectionPeriod: { month: number; year: number; workflowType?: string | null };
  requiredDocuments: { name: string; status: RequiredDocumentStatus; isRequired: boolean }[];
  uploadedDocuments: { createdAt: Date; qualityStatus: DocumentQualityStatus }[];
  reminderLogs: { channel?: string | null; createdAt: Date }[];
};

export type ClientComplianceProfile = {
  score: number;
  label: string;
  tone: string;
  averageResponseDays: number | null;
  averageDelayDays: number | null;
  averageReminders: number;
  invalidDocumentRate: number;
  commonMissingDocuments: { name: string; count: number }[];
  breakdown: string[];
  alerts: string[];
  trend: "improving" | "stable" | "worsening" | "new client" | "not enough data";
  monthlyScores: { label: string; score: number }[];
  pressureLevel: string;
  pressureStrategy: string;
  nextReminderTiming: string;
  frictionScore: number;
  serviceTier: string;
  repricingSignal: boolean;
};

export function complianceTrendLabel(trend: ClientComplianceProfile["trend"]) {
  const labels: Record<ClientComplianceProfile["trend"], string> = {
    improving: "En amélioration",
    stable: "Stable",
    worsening: "En dégradation",
    "new client": "Nouveau client",
    "not enough data": "Données insuffisantes"
  };
  return labels[trend];
}

export function complianceTrendTone(trend: ClientComplianceProfile["trend"]) {
  const tones: Record<ClientComplianceProfile["trend"], string> = {
    improving: "border-emerald-200 bg-emerald-50 text-emerald-800",
    stable: "border-slate-200 bg-slate-50 text-slate-700",
    worsening: "border-red-200 bg-red-50 text-red-800",
    "new client": "border-blue-200 bg-blue-50 text-blue-800",
    "not enough data": "border-slate-200 bg-slate-50 text-slate-600"
  };
  return tones[trend];
}

export function serviceTierLabel(tier: string) {
  const labels: Record<string, string> = {
    "Reprice candidate": "Candidat a la revalorisation",
    "Strict deadline": "Échéance stricte",
    "Early reminder": "Relance anticipee",
    Standard: "Standard"
  };
  return labels[tier] || tier;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstUploadFor(item: ComplianceCollection) {
  return [...item.uploadedDocuments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
}

function isInvalidQuality(status: DocumentQualityStatus) {
  return status !== DocumentQualityStatus.UNREVIEWED && status !== DocumentQualityStatus.VALID;
}

function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Fiable";
  if (score >= 50) return "A suivre";
  if (score >= 25) return "Difficile";
  return "Critique";
}

function scoreTone(score: number) {
  if (score >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 50) return "border-amber-200 bg-amber-50 text-amber-900";
  if (score >= 25) return "border-orange-200 bg-orange-50 text-orange-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function scoreOneCollection(item: ComplianceCollection) {
  const required = item.requiredDocuments.filter((doc) => doc.isRequired);
  const missing = required.filter((doc) => doc.status === RequiredDocumentStatus.MISSING).length;
  const invalid = item.uploadedDocuments.filter((doc) => isInvalidQuality(doc.qualityStatus)).length;
  const reminders = item.reminderLogs.length;
  const firstUpload = firstUploadFor(item);
  const deadline = workflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const lateDays = firstUpload ? Math.max(0, Math.ceil((firstUpload.createdAt.getTime() - deadline.getTime()) / 86400000)) : 0;

  let score = 100;
  score -= missing * 8;
  score -= invalid * 12;
  score -= reminders > 1 ? (reminders - 1) * 5 : 0;
  score -= lateDays * 3;
  if (!firstUpload && item.status !== ClientCollectionStatus.COMPLETE) score -= 18;
  if (item.status === ClientCollectionStatus.COMPLETE) score += 8;
  if (item.completionConfirmedAt) score += 4;
  return clamp(score);
}

function trendFromScores(scores: number[]): ClientComplianceProfile["trend"] {
  if (!scores.length) return "new client";
  if (scores.length < 3) return "not enough data";
  const first = scores.slice(0, Math.ceil(scores.length / 2)).reduce((sum, score) => sum + score, 0) / Math.ceil(scores.length / 2);
  const second = scores.slice(Math.floor(scores.length / 2)).reduce((sum, score) => sum + score, 0) / scores.slice(Math.floor(scores.length / 2)).length;
  if (second - first >= 8) return "improving";
  if (first - second >= 8) return "worsening";
  return "stable";
}

export function buildClientComplianceProfile(collections: ComplianceCollection[]): ClientComplianceProfile {
  const ordered = [...collections].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const monthlyScores = ordered.map((item) => ({
    label: `${String(item.collectionPeriod.month).padStart(2, "0")}/${item.collectionPeriod.year}`,
    score: scoreOneCollection(item)
  }));
  const scores = monthlyScores.map((item) => item.score);
  const score = scores.length ? clamp(scores.reduce((sum, item) => sum + item, 0) / scores.length) : 70;

  const responseDays = collections
    .map((item) => {
      const firstUpload = firstUploadFor(item);
      return firstUpload ? Math.max(0, Math.ceil((firstUpload.createdAt.getTime() - item.createdAt.getTime()) / 86400000)) : null;
    })
    .filter((value): value is number => value !== null);
  const averageResponseDays = responseDays.length ? Math.round(responseDays.reduce((sum, value) => sum + value, 0) / responseDays.length) : null;

  const delays = collections
    .map((item) => {
      const firstUpload = firstUploadFor(item);
      if (!firstUpload) return null;
      const deadline = workflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
      return Math.max(0, Math.ceil((firstUpload.createdAt.getTime() - deadline.getTime()) / 86400000));
    })
    .filter((value): value is number => value !== null);
  const averageDelayDays = delays.length ? Math.round(delays.reduce((sum, value) => sum + value, 0) / delays.length) : null;

  const reminderCount = collections.reduce((sum, item) => sum + item.reminderLogs.length, 0);
  const uploadCount = collections.reduce((sum, item) => sum + item.uploadedDocuments.length, 0);
  const invalidCount = collections.reduce(
    (sum, item) => sum + item.uploadedDocuments.filter((doc) => isInvalidQuality(doc.qualityStatus)).length,
    0
  );
  const missingByName = new Map<string, number>();
  for (const item of collections) {
    for (const doc of item.requiredDocuments) {
      if (doc.isRequired && doc.status === RequiredDocumentStatus.MISSING) {
        missingByName.set(doc.name, (missingByName.get(doc.name) || 0) + 1);
      }
    }
  }
  const commonMissingDocuments = [...missingByName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const breakdown: string[] = [];
  if (averageDelayDays && averageDelayDays > 0) breakdown.push(`Dépôt en retard de ${averageDelayDays} jour(s) en moyenne.`);
  if (reminderCount) breakdown.push(`${reminderCount} relance(s) necessaires sur l'historique.`);
  if (invalidCount) breakdown.push(`${invalidCount} fichier(s) invalide(s) ou rejetes.`);
  if (commonMissingDocuments[0]) breakdown.push(`Document souvent manquant: ${commonMissingDocuments[0].name}.`);
  if (!breakdown.length) breakdown.push("Client propre: peu de relances, peu de manquants et dépôts exploitables.");

  const alerts: string[] = [];
  if ((averageDelayDays || 0) >= 3) alerts.push("Client souvent en retard.");
  if (commonMissingDocuments[0]?.count >= 2) alerts.push(`${commonMissingDocuments[0].name} manque de facon repetee.`);
  if (collections.length && reminderCount / collections.length >= 3) alerts.push("Client dependant des relances.");
  if (invalidCount >= 2) alerts.push("Plusieurs fichiers invalides: rappeler les regles de qualite.");
  if (!alerts.length) alerts.push("Aucune alerte comportementale forte pour le moment.");

  const pressureLevel = score >= 90 ? "Douce" : score >= 75 ? "Normale" : score >= 50 ? "Ferme" : score >= 25 ? "Urgente" : "Non-conformite";
  const nextReminderTiming = score >= 90 ? "D-3" : score >= 75 ? "D-5" : score >= 50 ? "D-7" : score >= 25 ? "D-10" : "D-15 + appel";
  const pressureStrategy =
    score >= 75
      ? "Relance simple pres de l'échéance."
      : score >= 50
        ? "Relancer plus tot et vérifier l'ouverture du lien."
        : "Relancer tot, utiliser un ton ferme et prevoir un appel si le client ne repond pas.";
  const frictionScore = clamp(reminderCount * 8 + invalidCount * 12 + commonMissingDocuments.reduce((sum, item) => sum + item.count, 0) * 5);
  const serviceTier = score < 35 || frictionScore > 70 ? "Reprice candidate" : score < 50 ? "Strict deadline" : score < 75 ? "Early reminder" : "Standard";

  return {
    score,
    label: scoreLabel(score),
    tone: scoreTone(score),
    averageResponseDays,
    averageDelayDays,
    averageReminders: collections.length ? Math.round((reminderCount / collections.length) * 10) / 10 : 0,
    invalidDocumentRate: uploadCount ? Math.round((invalidCount / uploadCount) * 100) : 0,
    commonMissingDocuments,
    breakdown,
    alerts,
    trend: trendFromScores(scores),
    monthlyScores,
    pressureLevel,
    pressureStrategy,
    nextReminderTiming,
    frictionScore,
    serviceTier,
    repricingSignal: score < 45 && frictionScore > 50
  };
}
