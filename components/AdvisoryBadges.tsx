import type { AdvisoryConfidence, AdvisoryRiskLevel } from "@/lib/tva-advisory";
import { advisoryConfidenceLabel, advisoryConfidenceTone, advisoryRiskLabel, advisoryRiskTone } from "@/lib/tva-advisory";
import { cn } from "@/lib/utils";

export function AdvisoryRiskBadge({ level }: { level: AdvisoryRiskLevel }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", advisoryRiskTone[level])}>
      {advisoryRiskLabel[level]}
    </span>
  );
}

export function AdvisoryConfidenceBadge({ level }: { level: AdvisoryConfidence }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", advisoryConfidenceTone[level])}>
      {advisoryConfidenceLabel[level]}
    </span>
  );
}
