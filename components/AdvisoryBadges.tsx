import type { AdvisoryConfidence, AdvisoryRiskLevel } from "@/lib/tva-advisory";
import { advisoryConfidenceLabel, advisoryConfidenceTone, advisoryRiskLabel, advisoryRiskTone } from "@/lib/tva-advisory";
import { cn } from "@/lib/utils";

export function AdvisoryRiskBadge({ level }: { level: AdvisoryRiskLevel }) {
  return (
    <span className={cn("badge", advisoryRiskTone[level])}>
      <span className="badge-dot" aria-hidden="true" />
      {advisoryRiskLabel[level]}
    </span>
  );
}

export function AdvisoryConfidenceBadge({ level }: { level: AdvisoryConfidence }) {
  return (
    <span className={cn("badge", advisoryConfidenceTone[level])}>
      {advisoryConfidenceLabel[level]}
    </span>
  );
}
