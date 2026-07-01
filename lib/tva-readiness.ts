import { FiscalSeverity, TvaAmountEntryType, TvaPreparationStatus, TvaReadinessStatus } from "@prisma/client";

type MoneyValue = { toString(): string } | number | string | null | undefined;

export type ReadinessInput = {
  status?: string;
  tvaPreparationStatus?: TvaPreparationStatus | string;
  completionConfirmedAt?: Date | null;
  isLocked?: boolean;
  requiredDocuments: Array<{ name: string; isRequired: boolean; status: string }>;
  uploadedDocuments: Array<{ qualityStatus: string; requiredDocumentId?: string | null }>;
  tvaAmountEntries: Array<{
    type: TvaAmountEntryType | string;
    invoiceNumber?: string | null;
    invoiceDate?: Date | null;
    amountHT: MoneyValue;
    amountTVA: MoneyValue;
    amountTTC: MoneyValue;
    tvaRate: MoneyValue;
  }>;
};

function moneyToNumber(value: MoneyValue) {
  if (value == null) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(entries: ReadinessInput["tvaAmountEntries"], types: string[], field: "amountHT" | "amountTVA" | "amountTTC") {
  return entries.filter((entry) => types.includes(String(entry.type))).reduce((total, entry) => total + moneyToNumber(entry[field]), 0);
}

export function calculateTvaSummary(entries: ReadinessInput["tvaAmountEntries"]) {
  const salesHT = sum(entries, [TvaAmountEntryType.SALE], "amountHT");
  const salesTVA = sum(entries, [TvaAmountEntryType.SALE], "amountTVA");
  const salesTTC = sum(entries, [TvaAmountEntryType.SALE], "amountTTC");
  const purchaseHT = sum(entries, [TvaAmountEntryType.PURCHASE, TvaAmountEntryType.EXPENSE], "amountHT");
  const purchaseTVA = sum(entries, [TvaAmountEntryType.PURCHASE, TvaAmountEntryType.EXPENSE], "amountTVA");
  const purchaseTTC = sum(entries, [TvaAmountEntryType.PURCHASE, TvaAmountEntryType.EXPENSE], "amountTTC");
  const creditNoteTVA = sum(entries, [TvaAmountEntryType.CREDIT_NOTE], "amountTVA");
  const netTVA = salesTVA - purchaseTVA - creditNoteTVA;
  const entriesMissingInvoiceNumber = entries.filter((entry) => !entry.invoiceNumber).length;
  const entriesMissingDate = entries.filter((entry) => !entry.invoiceDate).length;
  const suspiciousEntries = entries.filter((entry) => {
    const ht = moneyToNumber(entry.amountHT);
    const tva = moneyToNumber(entry.amountTVA);
    const ttc = moneyToNumber(entry.amountTTC);
    return Math.abs(ht + tva - ttc) > 0.05 || (String(entry.type) !== TvaAmountEntryType.CREDIT_NOTE && (ht < 0 || tva < 0 || ttc < 0));
  }).length;

  return {
    salesHT,
    salesTVA,
    salesTTC,
    purchaseHT,
    purchaseTVA,
    purchaseTTC,
    creditNoteTVA,
    netTVA,
    entriesCount: entries.length,
    entriesMissingInvoiceNumber,
    entriesMissingDate,
    suspiciousEntries
  };
}

export function calculateTvaReadiness(input: ReadinessInput) {
  const missingRequired = input.requiredDocuments.filter((document) => document.isRequired && document.status === "MISSING");
  const unreviewedDocuments = input.uploadedDocuments.filter((document) => document.qualityStatus === "UNREVIEWED");
  const rejectedDocuments = input.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus));
  const unclassifiedDocuments = input.uploadedDocuments.filter((document) => !document.requiredDocumentId);
  const summary = calculateTvaSummary(input.tvaAmountEntries);

  const blockingIssues = [
    ...missingRequired.map((document) => `Document obligatoire manquant: ${document.name}`),
    ...rejectedDocuments.map((_, index) => `Document rejete ou invalide #${index + 1}`),
    summary.suspiciousEntries ? `${summary.suspiciousEntries} entree(s) TVA incoherente(s).` : null
  ].filter((issue): issue is string => Boolean(issue));

  const warningIssues = [
    unreviewedDocuments.length ? `${unreviewedDocuments.length} document(s) a verifier.` : null,
    unclassifiedDocuments.length ? `${unclassifiedDocuments.length} document(s) non classe(s).` : null,
    !input.completionConfirmedAt ? "Le client n'a pas encore confirme que tous les documents disponibles ont été envoyes." : null,
    !summary.entriesCount ? "Aucune entree TVA manuelle saisie." : null,
    summary.entriesMissingInvoiceNumber ? `${summary.entriesMissingInvoiceNumber} entree(s) sans numero de facture.` : null,
    summary.entriesMissingDate ? `${summary.entriesMissingDate} entree(s) sans date de facture.` : null,
    summary.entriesCount && !summary.salesTVA ? "Aucune TVA sur ventes saisie." : null,
    summary.entriesCount && !summary.purchaseTVA ? "Aucune TVA deductible saisie." : null
  ].filter((issue): issue is string => Boolean(issue));

  const status =
    blockingIssues.length > 0
      ? TvaReadinessStatus.BLOCKED
      : input.uploadedDocuments.length === 0 && input.tvaAmountEntries.length === 0
        ? TvaReadinessStatus.NOT_READY
        : warningIssues.length
          ? TvaReadinessStatus.READY_WITH_WARNINGS
          : TvaReadinessStatus.READY;

  const riskLevel =
    status === TvaReadinessStatus.BLOCKED
      ? FiscalSeverity.CRITICAL
      : warningIssues.length >= 3
        ? FiscalSeverity.HIGH
        : warningIssues.length
          ? FiscalSeverity.MEDIUM
          : FiscalSeverity.LOW;

  const score = Math.max(0, 100 - blockingIssues.length * 25 - warningIssues.length * 8);

  return {
    status,
    riskLevel,
    score,
    missingDocumentsCount: missingRequired.length,
    unreviewedDocumentsCount: unreviewedDocuments.length,
    rejectedDocumentsCount: rejectedDocuments.length,
    unresolvedQuestionsCount: unclassifiedDocuments.length,
    pendingDeclarationsCount: input.completionConfirmedAt ? 0 : 1,
    blockingIssues,
    warningIssues,
    summary,
    canMarkReady: status === TvaReadinessStatus.READY || status === TvaReadinessStatus.READY_WITH_WARNINGS
  };
}

export function readinessStatusLabel(status: TvaReadinessStatus | string) {
  return {
    NOT_READY: "Pas pret",
    READY_WITH_WARNINGS: "Prêt avec alertes",
    READY: "Prêt",
    BLOCKED: "Bloque"
  }[String(status)] || String(status);
}

export function readinessTone(status: TvaReadinessStatus | string) {
  if (status === TvaReadinessStatus.READY) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === TvaReadinessStatus.READY_WITH_WARNINGS) return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === TvaReadinessStatus.BLOCKED) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function preparationStatusLabel(status: TvaPreparationStatus | string) {
  return {
    COLLECTING: "Collecte",
    READY_FOR_REVIEW: "Prêt pour verification",
    UNDER_REVIEW: "En verification",
    READY_FOR_PREPARATION: "Prêt preparation",
    PREPARING: "Preparation",
    MANAGER_REVIEW: "Verification manager",
    READY_TO_DECLARE: "Prêt declaration",
    DECLARED: "Declare",
    ARCHIVED: "Archive",
    BLOCKED: "Bloque"
  }[String(status)] || String(status);
}
