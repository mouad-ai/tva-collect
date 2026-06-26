import { BarChart3, FileText, FolderKanban, Settings, Users } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/app", label: "Tableau de bord", icon: BarChart3 },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/collections", label: "Collectes TVA", icon: FolderKanban },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/settings", label: "Parametres", icon: Settings }
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/app" className="text-lg font-black text-ink">
            TVA Collect
          </Link>
          <div className="text-sm text-muted">{user.firm.name}</div>
          <form action="/api/auth/logout" method="post">
            <button className="btn">Deconnexion</button>
          </form>
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
