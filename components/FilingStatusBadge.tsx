import { TvaFilingStatus } from "@prisma/client";
import { filingStatusLabel, filingStatusTone } from "@/lib/tva-filing";
import { cn } from "@/lib/utils";

export function FilingStatusBadge({ status }: { status: TvaFilingStatus | string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", filingStatusTone(String(status)))}>
      {filingStatusLabel(String(status))}
    </span>
  );
}
