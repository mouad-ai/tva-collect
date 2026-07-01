import { ClientCollectionStatus, CollectionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Status = ClientCollectionStatus | CollectionStatus | string;

const labels: Record<string, string> = {
  NOT_STARTED: "Non commence",
  IN_PROGRESS: "En cours",
  MISSING: "Documents manquants",
  COMPLETE: "Dossier complet",
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  CLOSED: "Fermée",
  MISSING_DOC: "Manquant",
  RECEIVED: "Reçu",
  NOT_APPLICABLE: "N/A"
};

export function StatusBadge({ status }: { status: Status }) {
  const tone =
    status === "COMPLETE" || status === "RECEIVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "MISSING" || status === "MISSING_DOC"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "ACTIVE" || status === "IN_PROGRESS"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", tone)}>
      {labels[String(status)] || String(status)}
    </span>
  );
}
