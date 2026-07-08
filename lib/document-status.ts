import { DocumentQualityStatus, RequiredDocumentStatus } from "@prisma/client";
import { documentQualityLabel } from "@/lib/labels";

/**
 * Client-facing status shown on the public shared upload page.
 * This reflects the REAL validation state (from the cabinet's review),
 * not merely whether a file was uploaded.
 */
export type ClientDocStatus = "MISSING" | "PENDING" | "VALIDATED" | "REJECTED" | "NOT_APPLICABLE";

// Quality statuses the cabinet uses to reject/flag a document.
const rejectedQualityStatuses = new Set<string>([
  DocumentQualityStatus.WRONG_DOCUMENT,
  DocumentQualityStatus.UNREADABLE,
  DocumentQualityStatus.DUPLICATE,
  DocumentQualityStatus.MISSING_PAGE,
  DocumentQualityStatus.NOT_TVA
]);

export function isRejectedQuality(status: string | null | undefined) {
  return status ? rejectedQualityStatuses.has(status) : false;
}

export function isValidQuality(status: string | null | undefined) {
  return status === DocumentQualityStatus.VALID;
}

type UploadLike = {
  qualityStatus: string;
  accountantComment?: string | null;
  createdAt: Date;
};

/**
 * Derive the client-facing status of a required document from the cabinet's
 * review of its uploaded files. The MOST RECENT upload wins so that a client
 * who re-uploads after a rejection immediately sees "en attente" again.
 */
export function clientDocStatus(
  requiredStatus: RequiredDocumentStatus | string,
  uploads: UploadLike[]
): { status: ClientDocStatus; reason?: string | null } {
  const latest = [...uploads].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!latest) {
    if (requiredStatus === RequiredDocumentStatus.NOT_APPLICABLE) return { status: "NOT_APPLICABLE" };
    // A file may exist but be unclassified (not linked to this required doc).
    if (requiredStatus === RequiredDocumentStatus.RECEIVED) return { status: "PENDING" };
    return { status: "MISSING" };
  }

  if (isValidQuality(latest.qualityStatus)) return { status: "VALIDATED" };
  if (isRejectedQuality(latest.qualityStatus)) {
    return { status: "REJECTED", reason: latest.accountantComment ?? null };
  }
  return { status: "PENDING" };
}

export function clientDocStatusLabel(status: ClientDocStatus) {
  const labels: Record<ClientDocStatus, string> = {
    MISSING: "Manquant",
    PENDING: "En attente de validation",
    VALIDATED: "Validé",
    REJECTED: "Rejeté",
    NOT_APPLICABLE: "Non requis"
  };
  return labels[status];
}

export function clientDocStatusTone(status: ClientDocStatus) {
  const tones: Record<ClientDocStatus, string> = {
    MISSING: "border-amber-200 bg-amber-50 text-amber-800",
    PENDING: "border-blue-200 bg-blue-50 text-blue-700",
    VALIDATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    NOT_APPLICABLE: "border-slate-200 bg-slate-50 text-slate-600"
  };
  return tones[status];
}

/**
 * Per-file client-facing label (used in the "files received" list).
 * Reuses the cabinet quality vocabulary but frames unreviewed uploads as pending.
 */
export function clientFileStatus(qualityStatus: string): { status: ClientDocStatus; label: string } {
  if (isValidQuality(qualityStatus)) return { status: "VALIDATED", label: "Validé" };
  if (isRejectedQuality(qualityStatus)) {
    return { status: "REJECTED", label: `Rejeté – ${documentQualityLabel(qualityStatus)}` };
  }
  return { status: "PENDING", label: "En attente de validation" };
}
