import { BarChart3, Building2, ClipboardList, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/firms", label: "Firms", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/events", label: "Events", icon: ClipboardList }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/admin" className="text-lg font-black">TVA Collect Admin</Link>
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="font-bold">{user.name}</div>
              <div className="text-xs text-muted">{user.email}</div>
            </div>
            <Link href="/app" className="btn">Retour app</Link>
            <form action="/api/auth/logout" method="post">
              <button className="btn"><LogOut size={16} /> Deconnexion</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-2">
          <nav className="grid gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
