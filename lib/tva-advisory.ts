import { TvaPaymentStatus } from "@prisma/client";

type MoneyValue = { toString(): string } | number | string | null | undefined;

export type AdvisoryRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AdvisoryConfidence = "LOW" | "MEDIUM" | "HIGH";

export const advisoryRiskLabel: Record<AdvisoryRiskLevel, string> = {
  LOW: "Sain",
  MEDIUM: "À surveiller",
  HIGH: "Élevé",
  CRITICAL: "Critique"
};

export const advisoryRiskTone: Record<AdvisoryRiskLevel, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-800"
};

export const advisoryConfidenceLabel: Record<AdvisoryConfidence, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Haute"
};

export const advisoryConfidenceTone: Record<AdvisoryConfidence, string> = {
  LOW: "border-red-200 bg-red-50 text-red-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

export const advisorySeverityLabel: Record<string, string> = {
  INFO: "Info",
  WARNING: "Alerte",
  IMPORTANT: "Important",
  CRITICAL: "Critique"
};

export const advisorySeverityTone: Record<string, string> = {
  INFO: "border-slate-200 bg-slate-50 text-slate-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-800",
  IMPORTANT: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-800"
};

export const advisoryCategoryLabel: Record<string, string> = {
  CASHFLOW: "Trésorerie",
  DOCUMENTS: "Documents",
  RISK: "Risque",
  VARIANCE: "Variation",
  PROCESS: "Processus"
};

export type TvaAdvisoryFilingCase = {
  id: string;
  clientId: string;
  clientCollectionId: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  paymentDeadline: Date;
};

export type TvaAdvisoryPayment = {
  filingCaseId: string;
  status: string;
  amountDue: MoneyValue;
  amountPaid: MoneyValue;
  paymentDate?: Date | null;
};

export type TvaAdvisoryClientCollection = {
  id: string;
  clientId: string;
  client: {
    companyName: string;
    phone?: string | null;
    email?: string | null;
  };
  requiredDocuments: Array<{
    name: string;
    isRequired: boolean;
    status: string;
  }>;
  uploadedDocuments: Array<{
    qualityStatus: string;
  }>;
};

export type TvaAdvisoryRow = {
  filingCaseId: string;
  clientId: string;
  clientCollectionId: string;
  clientName: string;
  clientContact: string;
  periodLabel: string;
  filingStatus: string;
  paymentStatus: string;
  paymentDeadline: Date;
  daysToPayment: number;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  estimatedNetTva: number;
  previousAverage: number;
  variancePercent: number | null;
  confidence: AdvisoryConfidence;
  riskLevel: AdvisoryRiskLevel;
  missingRequired: number;
  missingDeductibleSignals: string[];
  unreviewedDocuments: number;
  invalidDocuments: number;
  auditCases: number;
  sourceLabel: string;
  reasons: string[];
};

export type TvaAdvisoryRecommendation = {
  id: string;
  category: "CASHFLOW" | "DOCUMENTS" | "RISK" | "VARIANCE" | "PROCESS";
  severity: "INFO" | "WARNING" | "IMPORTANT" | "CRITICAL";
  title: string;
  description: string;
  recommendedAction: string;
  href: string;
};

const monthNames = [
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

function moneyToNumber(value: MoneyValue) {
  if (value == null) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function periodIndex(item: { periodYear: number; periodMonth: number }) {
  return item.periodYear * 12 + item.periodMonth;
}

function daysUntil(date: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isPaymentClosed(status: string) {
  return status === TvaPaymentStatus.PAID || status === TvaPaymentStatus.NOT_REQUIRED;
}

function missingDeductibleSignals(requiredDocuments: TvaAdvisoryClientCollection["requiredDocuments"]) {
  const deductiblePattern = /(achat|frais|rélevé|relevé|banque|bancaire|avoir|depense|dépense|fournisseur|note)/i;
  return requiredDocuments
    .filter((document) => document.isRequired && document.status === "MISSING" && deductiblePattern.test(document.name))
    .map((document) => document.name);
}

function confidenceLevel(args: {
  amountDue: number;
  previousAverage: number;
  missingRequired: number;
  unreviewedDocuments: number;
  invalidDocuments: number;
}) {
  if (args.invalidDocuments > 0 || args.missingRequired > 2 || args.unreviewedDocuments > 4) return "LOW";
  if (!args.amountDue && !args.previousAverage) return "LOW";
  if (args.missingRequired > 0 || args.unreviewedDocuments > 0 || !args.amountDue) return "MEDIUM";
  return "HIGH";
}

function riskLevel(args: {
  amountDue: number;
  remainingAmount: number;
  daysToPayment: number;
  paymentStatus: string;
  confidence: AdvisoryConfidence;
  variancePercent: number | null;
  auditCases: number;
}) {
  if (isPaymentClosed(args.paymentStatus)) return "LOW";
  if (args.daysToPayment < 0 && args.remainingAmount > 0) return "CRITICAL";
  if (args.amountDue >= 20000 && args.daysToPayment <= 7) return "CRITICAL";
  if (args.auditCases > 0 && args.daysToPayment <= 7) return "HIGH";
  if (args.amountDue >= 20000 || args.daysToPayment <= 3) return "HIGH";
  if (args.confidence === "LOW" || (args.variancePercent != null && args.variancePercent >= 50)) return "MEDIUM";
  if (args.remainingAmount > 0) return "MEDIUM";
  return "LOW";
}

export function formatMad(amount: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function buildTvaAdvisoryPortfolio(args: {
  filingCases: TvaAdvisoryFilingCase[];
  payments: TvaAdvisoryPayment[];
  clientCollections: TvaAdvisoryClientCollection[];
  auditCasesByFilingCaseId?: Map<string, number>;
  now?: Date;
}) {
  const paymentsByCaseId = new Map(args.payments.map((payment) => [payment.filingCaseId, payment]));
  const collectionsById = new Map(args.clientCollections.map((collection) => [collection.id, collection]));
  const historicalDueByClient = new Map<string, Array<{ period: number; amountDue: number }>>();

  for (const filingCase of args.filingCases) {
    const payment = paymentsByCaseId.get(filingCase.id);
    const amountDue = moneyToNumber(payment?.amountDue);
    if (amountDue <= 0) continue;
    const history = historicalDueByClient.get(filingCase.clientId) || [];
    history.push({ period: periodIndex(filingCase), amountDue });
    historicalDueByClient.set(filingCase.clientId, history);
  }

  const rows: TvaAdvisoryRow[] = args.filingCases
    .map((filingCase) => {
      const collection = collectionsById.get(filingCase.clientCollectionId);
      if (!collection) return null;

      const payment = paymentsByCaseId.get(filingCase.id);
      const paymentStatus = payment?.status || TvaPaymentStatus.PENDING;
      const amountDue = moneyToNumber(payment?.amountDue);
      const amountPaid = moneyToNumber(payment?.amountPaid);
      const previousValues = (historicalDueByClient.get(filingCase.clientId) || [])
        .filter((item) => item.period < periodIndex(filingCase))
        .sort((a, b) => b.period - a.period)
        .slice(0, 3)
        .map((item) => item.amountDue);
      const previousAverage = avg(previousValues);
      const estimatedNetTva = amountDue || previousAverage;
      const variancePercent = previousAverage > 0 ? ((estimatedNetTva - previousAverage) / previousAverage) * 100 : null;
      const remainingAmount = Math.max(0, amountDue - amountPaid);
      const missingRequired = collection.requiredDocuments.filter((document) => document.isRequired && document.status === "MISSING").length;
      const missingDeductibles = missingDeductibleSignals(collection.requiredDocuments);
      const unreviewedDocuments = collection.uploadedDocuments.filter((document) => document.qualityStatus === "UNREVIEWED").length;
      const invalidDocuments = collection.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;
      const confidence = confidenceLevel({ amountDue, previousAverage, missingRequired, unreviewedDocuments, invalidDocuments });
      const daysToPayment = daysUntil(filingCase.paymentDeadline, args.now);
      const auditCases = args.auditCasesByFilingCaseId?.get(filingCase.id) || 0;
      const risk = riskLevel({
        amountDue: estimatedNetTva,
        remainingAmount: amountDue ? remainingAmount : estimatedNetTva,
        daysToPayment,
        paymentStatus,
        confidence,
        variancePercent,
        auditCases
      });

      const reasons = [
        amountDue ? `Montant TVA saisi: ${formatMad(amountDue)}.` : "Montant TVA non encore confirme.",
        previousAverage ? `Moyenne des périodes precedentes: ${formatMad(previousAverage)}.` : null,
        missingRequired ? `${missingRequired} document(s) obligatoire(s) manquant(s).` : null,
        missingDeductibles.length ? `${missingDeductibles.length} piste(s) deductible(s) à récupérer.` : null,
        unreviewedDocuments ? `${unreviewedDocuments} document(s) non revu(s).` : null,
        invalidDocuments ? `${invalidDocuments} document(s) invalide(s).` : null,
        auditCases ? `${auditCases} dossier(s) fiscal/audit lie(s).` : null,
        variancePercent != null && Math.abs(variancePercent) >= 50 ? `Variation TVA estimee: ${variancePercent.toFixed(0)}%.` : null
      ].filter((reason): reason is string => Boolean(reason));

      return {
        filingCaseId: filingCase.id,
        clientId: filingCase.clientId,
        clientCollectionId: filingCase.clientCollectionId,
        clientName: collection.client.companyName,
        clientContact: collection.client.phone || collection.client.email || "-",
        periodLabel: `${monthNames[filingCase.periodMonth - 1]} ${filingCase.periodYear}`,
        filingStatus: filingCase.status,
        paymentStatus,
        paymentDeadline: filingCase.paymentDeadline,
        daysToPayment,
        amountDue,
        amountPaid,
        remainingAmount,
        estimatedNetTva,
        previousAverage,
        variancePercent,
        confidence,
        riskLevel: risk,
        missingRequired,
        missingDeductibleSignals: missingDeductibles,
        unreviewedDocuments,
        invalidDocuments,
        auditCases,
        sourceLabel: amountDue ? "Montant confirme" : previousAverage ? "Estimation historique" : "A saisir",
        reasons
      };
    })
    .filter((row): row is TvaAdvisoryRow => Boolean(row));

  const openRows = rows.filter((row) => !isPaymentClosed(row.paymentStatus));
  const totalEstimatedNetTva = openRows.reduce((total, row) => total + row.estimatedNetTva, 0);
  const totalConfirmedDue = openRows.reduce((total, row) => total + row.amountDue, 0);
  const totalRemaining = openRows.reduce((total, row) => total + (row.amountDue ? row.remainingAmount : row.estimatedNetTva), 0);
  const criticalRows = rows.filter((row) => row.riskLevel === "CRITICAL");
  const highRows = rows.filter((row) => row.riskLevel === "HIGH");
  const lowConfidenceRows = rows.filter((row) => row.confidence === "LOW");
  const missingDataRows = rows.filter((row) => row.missingRequired || row.unreviewedDocuments || row.invalidDocuments);
  const dueSoonRows = openRows.filter((row) => row.daysToPayment >= 0 && row.daysToPayment <= 7);
  const lateRows = openRows.filter((row) => row.daysToPayment < 0);

  const portfolioRiskScore = Math.min(
    100,
    criticalRows.length * 25 +
      highRows.length * 15 +
      lowConfidenceRows.length * 8 +
      missingDataRows.length * 5 +
      dueSoonRows.length * 10 +
      lateRows.length * 20
  );

  const recommendations: TvaAdvisoryRecommendation[] = rows
    .flatMap((row) => {
      const href = `/app/tva-filing/${row.filingCaseId}`;
      const items: TvaAdvisoryRecommendation[] = [];

      if (row.riskLevel === "CRITICAL" || row.riskLevel === "HIGH") {
        items.push({
          id: `${row.filingCaseId}-cashflow`,
          category: "CASHFLOW",
          severity: row.riskLevel === "CRITICAL" ? "CRITICAL" : "IMPORTANT",
          title: `Preparer la tresorerie TVA - ${row.clientName}`,
          description: `${row.periodLabel}: exposition estimee ${formatMad(row.estimatedNetTva)} avec échéance paiement dans ${row.daysToPayment} jour(s).`,
          recommendedAction: "Contacter le client et confirmer la capacite de paiement avant l'échéance.",
          href
        });
      }

      if (!row.amountDue && row.confidence === "LOW") {
        items.push({
          id: `${row.filingCaseId}-estimate`,
          category: "PROCESS",
          severity: "WARNING",
          title: `Saisir une estimation TVA - ${row.clientName}`,
          description: "Le montant TVA n'est pas encore saisi et l'historique ne suffit pas pour une estimation fiable.",
          recommendedAction: "Ajouter un montant preliminaire dans le dossier de declaration TVA.",
          href
        });
      }

      if (row.missingDeductibleSignals.length) {
        items.push({
          id: `${row.filingCaseId}-deductible`,
          category: "DOCUMENTS",
          severity: "IMPORTANT",
          title: `Reçuperer les pieces deductibles - ${row.clientName}`,
          description: row.missingDeductibleSignals.slice(0, 3).join(", "),
          recommendedAction: "Lancer une relance ciblee avant declaration.",
          href
        });
      }

      if (row.variancePercent != null && Math.abs(row.variancePercent) >= 50) {
        items.push({
          id: `${row.filingCaseId}-variance`,
          category: "VARIANCE",
          severity: Math.abs(row.variancePercent) >= 100 ? "CRITICAL" : "WARNING",
          title: `Variation TVA inhabituelle - ${row.clientName}`,
          description: `La TVA estimee varie de ${row.variancePercent.toFixed(0)}% vs la moyenne recente.`,
          recommendedAction: "Vérifier les ventes, achats, avoirs et pieces manquantes avant validation.",
          href
        });
      }

      return items;
    })
    .sort((a, b) => {
      const weight = { CRITICAL: 4, IMPORTANT: 3, WARNING: 2, INFO: 1 };
      return weight[b.severity] - weight[a.severity];
    })
    .slice(0, 12);

  return {
    rows: rows.sort((a, b) => {
      const riskWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return riskWeight[b.riskLevel] - riskWeight[a.riskLevel] || a.daysToPayment - b.daysToPayment;
    }),
    recommendations,
    summary: {
      totalEstimatedNetTva,
      totalConfirmedDue,
      totalRemaining,
      criticalCount: criticalRows.length,
      highCount: highRows.length,
      lowConfidenceCount: lowConfidenceRows.length,
      missingDataCount: missingDataRows.length,
      dueSoonCount: dueSoonRows.length,
      lateCount: lateRows.length,
      portfolioRiskScore,
      riskLabel:
        portfolioRiskScore >= 70 ? "Critique" : portfolioRiskScore >= 45 ? "À risque" : portfolioRiskScore >= 20 ? "À surveiller" : "Sain"
    }
  };
}
