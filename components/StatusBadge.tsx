import { ClientCollectionStatus, CollectionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Status = ClientCollectionStatus | CollectionStatus | string;

const labels: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  MISSING: "Documents manquants",
  COMPLETE: "Dossier complet",
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  CLOSED: "Fermée",
  MISSING_DOC: "Manquant",
  RECEIVED: "Reçu",
  NOT_APPLICABLE: "N/A",
  PENDING: "En attente",
  VALIDATED: "Validé",
  REJECTED: "Rejeté"
};

export function StatusBadge({ status }: { status: Status }) {
  const tone =
    status === "COMPLETE" || status === "RECEIVED" || status === "VALIDATED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "MISSING" || status === "MISSING_DOC"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : status === "ACTIVE" || status === "IN_PROGRESS" || status === "PENDING"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={cn("badge", tone)}>
      <span className="badge-dot" aria-hidden="true" />
      {labels[String(status)] || String(status)}
    </span>
  );
}
