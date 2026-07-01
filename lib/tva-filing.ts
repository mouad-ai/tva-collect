import { TvaFilingStatus, TvaPaymentStatus, TvaSubmissionStatus } from "@prisma/client";
import { workflowDeadline } from "@/lib/tva";

type FiscalDeadlineConfig = {
  defaultDeclarationDay: number;
  defaultPaymentDay: number;
} | null | undefined;

export function tvaFilingDeadlines(workflowType: string | null | undefined, year: number, month: number) {
  const declarationDeadline = workflowDeadline(workflowType, year, month);
  const paymentDeadline = new Date(declarationDeadline);
  paymentDeadline.setDate(paymentDeadline.getDate() + 5);
  return { declarationDeadline, paymentDeadline };
}

export function tvaFilingDeadlinesWithConfig(
  workflowType: string | null | undefined,
  year: number,
  month: number,
  fiscalConfig?: FiscalDeadlineConfig,
  clientOverrides?: { declarationDayOverride?: number | null; paymentDayOverride?: number | null } | null
) {
  const isTvaWorkflow = workflowType === "TVA_MONTHLY" || workflowType === "TVA_QUARTERLY" || !workflowType;
  if (!isTvaWorkflow) return tvaFilingDeadlines(workflowType, year, month);

  const declarationDay = clientOverrides?.declarationDayOverride || fiscalConfig?.defaultDeclarationDay || 20;
  const paymentDay = clientOverrides?.paymentDayOverride || fiscalConfig?.defaultPaymentDay || declarationDay + 5;
  return {
    declarationDeadline: new Date(year, month, declarationDay, 12, 0, 0, 0),
    paymentDeadline: new Date(year, month, paymentDay, 12, 0, 0, 0)
  };
}

export function filingStatusLabel(status: TvaFilingStatus | string) {
  return {
    DRAFT: "Brouillon",
    READY_TO_FILE: "Prêt à déclarer",
    FILED: "Déclaré",
    PAYMENT_PENDING: "Paiement en attente",
    PAID: "Payé",
    ARCHIVED: "Archivé",
    BLOCKED: "Bloqué",
    AMENDED: "Rectifié"
  }[String(status)] || String(status);
}

export function submissionStatusLabel(status: TvaSubmissionStatus | string) {
  return {
    NOT_SUBMITTED: "Non soumis",
    SUBMITTED: "Soumis",
    REJECTED: "Rejete",
    NEEDS_CORRECTION: "Correction requise"
  }[String(status)] || String(status);
}

export function paymentStatusLabel(status: TvaPaymentStatus | string) {
  return {
    NOT_REQUIRED: "Non requis",
    PENDING: "En attente",
    PAID: "Payé",
    LATE: "En retard",
    FAILED: "Échec"
  }[String(status)] || String(status);
}

export function paymentStatusTone(status: string) {
  if (status === "PAID" || status === "NOT_REQUIRED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "LATE" || status === "FAILED") return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function filingStatusTone(status: string) {
  if (status === "PAID" || status === "ARCHIVED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "FILED" || status === "PAYMENT_PENDING" || status === "READY_TO_FILE") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "BLOCKED" || status === "AMENDED") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function deadlineWarning(deadline: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 12, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} jour(s) en retard`, severity: "CRITICAL" };
  if (days <= 2) return { label: `${days} jour(s) restant(s)`, severity: "HIGH" };
  if (days <= 7) return { label: `${days} jour(s) restant(s)`, severity: "MEDIUM" };
  return { label: `${days} jour(s) restant(s)`, severity: "LOW" };
}
