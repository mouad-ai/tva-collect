import Link from "next/link";

function pageHref(searchParams: Record<string, string | undefined>, page: number, limit: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page" && key !== "limit") params.set(key, value);
  }
  params.set("page", String(page));
  params.set("limit", String(limit));
  return `?${params.toString()}`;
}

export function PaginationControls({
  total,
  page,
  limit,
  searchParams
}: {
  total: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total ? (current - 1) * limit + 1 : 0;
  const to = Math.min(total, current * limit);

  return (
    <div className="pagination-bar" aria-label="Pagination">
      <div className="text-sm font-bold text-muted">
        {from}-{to} sur {total} resultat(s) - Page {current}/{totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-muted">Par page</span>
        {[10, 25, 50].map((size) => (
          <Link key={size} href={pageHref(searchParams, 1, size)} className={size === limit ? "btn btn-primary" : "btn"}>
            {size}
          </Link>
        ))}
        <Link aria-disabled={current <= 1} href={pageHref(searchParams, Math.max(1, current - 1), limit)} className={current <= 1 ? "btn btn-disabled" : "btn"}>
          Precedent
        </Link>
        <Link aria-disabled={current >= totalPages} href={pageHref(searchParams, Math.min(totalPages, current + 1), limit)} className={current >= totalPages ? "btn btn-disabled" : "btn"}>
          Suivant
        </Link>
      </div>
    </div>
  );
}
