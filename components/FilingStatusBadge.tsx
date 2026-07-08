import { TvaFilingStatus } from "@prisma/client";
import { filingStatusLabel, filingStatusTone } from "@/lib/tva-filing";
import { cn } from "@/lib/utils";

export function FilingStatusBadge({ status }: { status: TvaFilingStatus | string }) {
  return (
    <span className={cn("badge", filingStatusTone(String(status)))}>
      <span className="badge-dot" aria-hidden="true" />
      {filingStatusLabel(String(status))}
    </span>
  );
}
