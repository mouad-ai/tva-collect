import { DocumentQualityStatus } from "@prisma/client";
import { documentQualityLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const toneByStatus: Record<string, string> = {
  UNREVIEWED: "border-amber-200 bg-amber-50 text-amber-800",
  VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WRONG_DOCUMENT: "border-red-200 bg-red-50 text-red-700",
  UNREADABLE: "border-red-200 bg-red-50 text-red-700",
  DUPLICATE: "border-orange-200 bg-orange-50 text-orange-800",
  MISSING_PAGE: "border-orange-200 bg-orange-50 text-orange-800",
  NOT_TVA: "border-slate-200 bg-slate-50 text-slate-700"
};

export function DocumentQualityBadge({ status }: { status: DocumentQualityStatus | string }) {
  const key = String(status);
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", toneByStatus[key] || "border-slate-200 bg-slate-50 text-slate-700")}>
      {documentQualityLabel(key)}
    </span>
  );
}
