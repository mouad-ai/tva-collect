import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="empty-state">
      {Icon ? (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon size={22} />
        </div>
      ) : null}
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={actionHref} className="btn btn-primary">{actionLabel}</Link>
          {secondaryHref && secondaryLabel ? <Link href={secondaryHref} className="btn">{secondaryLabel}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
