"use client";

import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchFilterForm({
  searchPlaceholder = "Rechercher",
  filters = []
}: {
  searchPlaceholder?: string;
  filters?: Array<{ name: string; label: string; value?: string; options: Array<{ value: string; label: string }> }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("search", query);
      else params.delete("search");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [pathname, query, router, searchParams]);

  return (
    <form className="filter-bar" aria-label="Filtres">
      {/* UX-FIX: debounced URL-persisted search and filter controls for list pages. */}
      <label className="min-w-[240px] flex-1">
        Recherche
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
          <input className="pl-9" name="search" value={query} placeholder={searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </label>
      {filters.map((filter) => (
        <label key={filter.name} className="min-w-[180px]">
          {filter.label}
          <select
            name={filter.name}
            defaultValue={filter.value || ""}
            onChange={(event) => {
              const params = new URLSearchParams(searchParams.toString());
              if (event.target.value) params.set(filter.name, event.target.value);
              else params.delete(filter.name);
              params.set("page", "1");
              router.replace(`${pathname}?${params.toString()}`);
            }}
          >
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      <Link href={pathname} className="btn self-end">
        <RotateCcw size={16} /> Effacer filtres
      </Link>
    </form>
  );
}
