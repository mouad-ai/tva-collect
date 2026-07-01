import { FiscalAuditCaseStatus, FiscalSeverity } from "@prisma/client";

type RiskInput = {
  severity: FiscalSeverity | string;
  openNotices: number;
  overdueNotices: number;
  openEvidenceRequests: number;
  overdueEvidenceRequests: number;
  draftResponses: number;
};

export function fiscalSeverityLabel(value: string) {
  return {
    LOW: "Faible",
    MEDIUM: "Moyen",
    HIGH: "Élevé",
    CRITICAL: "Critique"
  }[value] || value;
}

export function fiscalAuditTypeLabel(value: string) {
  return {
    TAX_CONTROL: "Contrôle fiscal",
    INTERNAL_REVIEW: "Revue interne",
    CLIENT_DISPUTE: "Litige client",
    MISSING_PROOF: "Preuve manquante",
    OTHER: "Autre"
  }[value] || value;
}

export function noticeTypeLabel(value: string) {
  return {
    REQUEST_INFO: "Demande d'information",
    PAYMENT_NOTICE: "Avis de paiement",
    PENALTY_NOTICE: "Avis de penalite",
    CORRECTION_REQUEST: "Demande de correction",
    CONTROL_NOTICE: "Avis de contrôle",
    OTHER: "Autre"
  }[value] || value;
}

export function fiscalStatusLabel(value: string) {
  return {
    OPEN: "Ouvert",
    IN_PROGRESS: "En cours",
    WAITING_CLIENT: "Attente client",
    WAITING_AUTHORITY: "Attente administration",
    RESOLVED: "Resolu",
    CLOSED: "Ferme"
  }[value] || value;
}

export function noticeStatusLabel(value: string) {
  return {
    NEW: "Nouveau",
    REVIEWED: "Revise",
    RESPONSE_REQUIRED: "Reponse requise",
    RESPONDED: "Repondu",
    CLOSED: "Ferme"
  }[value] || value;
}

export function evidenceStatusLabel(value: string) {
  return {
    TODO: "A faire",
    IN_PROGRESS: "En cours",
    WAITING_CLIENT: "Attente client",
    READY: "Prêt",
    SUBMITTED: "Soumis",
    ACCEPTED: "Accepte",
    REJECTED: "Rejete"
  }[value] || value;
}

export function responseStatusLabel(value: string) {
  return {
    DRAFT: "Brouillon",
    REVIEW_REQUIRED: "Verification requise",
    APPROVED: "Approuve",
    SENT: "Envoye"
  }[value] || value;
}

export function severityTone(value: string) {
  if (value === "LOW") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "HIGH") return "border-orange-200 bg-orange-50 text-orange-900";
  return "border-red-200 bg-red-50 text-red-800";
}

export function fiscalStatusTone(value: string) {
  if (value === FiscalAuditCaseStatus.CLOSED || value === FiscalAuditCaseStatus.RESOLVED) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === FiscalAuditCaseStatus.WAITING_AUTHORITY || value === FiscalAuditCaseStatus.WAITING_CLIENT) return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function isOverdue(date?: Date | null, now = new Date()) {
  return Boolean(date && date.getTime() < now.getTime());
}

export function buildFiscalRiskExposure(input: RiskInput) {
  const severityBase = input.severity === "CRITICAL" ? 35 : input.severity === "HIGH" ? 25 : input.severity === "MEDIUM" ? 12 : 4;
  const score = Math.min(
    100,
    Math.round(
      severityBase +
        input.openNotices * 8 +
        input.overdueNotices * 18 +
        input.openEvidenceRequests * 10 +
        input.overdueEvidenceRequests * 20 +
        input.draftResponses * 6
    )
  );
  const level = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const reasons = [
    input.overdueNotices ? `${input.overdueNotices} notice(s) avec échéance depassee.` : null,
    input.overdueEvidenceRequests ? `${input.overdueEvidenceRequests} demande(s) de preuve en retard.` : null,
    input.openNotices ? `${input.openNotices} notice(s) encore ouverte(s).` : null,
    input.openEvidenceRequests ? `${input.openEvidenceRequests} preuve(s) a collecter.` : null,
    input.draftResponses ? `${input.draftResponses} reponse(s) en brouillon.` : null
  ].filter((item): item is string => Boolean(item));
  return {
    score,
    level,
    reasons: reasons.length ? reasons : ["Aucune exposition fiscale forte detectee."]
  };
}
