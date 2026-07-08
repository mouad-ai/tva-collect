import { LogOut, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminSidebar } from "@/components/AdminSidebar";
import { requireAdmin } from "@/lib/auth";
import { adminInternalBase, hrefForBase } from "@/lib/routing";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: {
    default: "Administration",
    template: "%s | Administration"
  }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const headerStore = await headers();
  const visibleBase = headerStore.get("x-visible-base") ?? adminInternalBase;

  return (
    <div className="app-shell app-shell-admin">
      <header className="app-shell-header" role="banner">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href={hrefForBase(visibleBase, "/")} className="app-shell-brand">
              <span className="app-shell-brand-mark">TVA</span>
              Administration
            </Link>
            <span className="admin-pill">
              <ShieldAlert size={12} />
              Zone privilégiée
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-indigo-200">{user.email}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn border-white/20 bg-white/5 text-white hover:bg-white/10" type="submit">
                <LogOut size={16} />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[232px_1fr]">
        <aside className="card app-shell-sidebar h-fit">
          <AdminSidebar basePath={visibleBase} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
