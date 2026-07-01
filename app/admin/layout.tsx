import { LogOut } from "lucide-react";
import Link from "next/link";
import { AdminSidebar } from "@/components/AdminSidebar";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="app-shell">
      <header className="app-shell-header" role="banner">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link href="/admin" className="app-shell-brand">
            <span className="app-shell-brand-mark">TVA</span>
            Administration
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-muted">{user.email}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn" type="submit">
                <LogOut size={16} />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[232px_1fr]">
        <aside className="card app-shell-sidebar h-fit">
          <AdminSidebar />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
