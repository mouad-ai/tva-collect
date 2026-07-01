import Link from "next/link";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  if (items.length <= 1) return null;
  return (
    <nav className="breadcrumbs" aria-label="Fil d'Ariane">
      {/* UX-FIX: deeper pages expose a consistent back path via breadcrumbs. */}
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          {index < items.length - 1 ? <span aria-hidden="true">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
