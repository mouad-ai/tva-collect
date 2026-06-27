import { BarChart3, Bell, CircleHelp, ClipboardList, CreditCard, FileText, FolderKanban, LifeBuoy, MailCheck, Search, Settings, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { isAdminEmail, requireUser } from "@/lib/auth";

const nav = [
  { href: "/app", label: "Tableau de bord", icon: BarChart3 },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/collections", label: "Collectes TVA", icon: FolderKanban },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/reminders", label: "Relances", icon: MailCheck },
  { href: "/app/work-queue", label: "Work Queue", icon: ClipboardList },
  { href: "/app/reports", label: "Rapports", icon: BarChart3 },
  { href: "/app/proof-vault", label: "Proof Vault", icon: ShieldCheck },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Parametres", icon: Settings },
  { href: "/app/help", label: "Aide", icon: LifeBuoy }
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
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" title="Recherche"><Search size={16} /></button>
            <button className="btn" title="Notifications"><Bell size={16} /></button>
            <Link href="/app/help" className="btn" title="Aide"><CircleHelp size={16} /></Link>
            {isAdminEmail(user.email) ? <Link href="/admin" className="btn">Admin</Link> : null}
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="font-bold">{user.firm.name}</div>
              <div className="text-xs text-muted">{user.name}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn">Deconnexion</button>
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
