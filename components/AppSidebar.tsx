"use client";

import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  FileWarning,
  FolderKanban,
  LifeBuoy,
  MailCheck,
  Settings,
  ShieldCheck,
  Trash2,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Tableau de bord", icon: BarChart3 },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/collections", label: "Collectes TVA", icon: FolderKanban },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/tva-readiness", label: "Preparation TVA", icon: ClipboardList },
  { href: "/app/tva-risk-register", label: "Risques TVA", icon: FileWarning },
  { href: "/app/tva-filing", label: "Declaration TVA", icon: ShieldCheck },
  { href: "/app/tva-portfolio-exposure", label: "Tresorerie TVA", icon: CreditCard },
  { href: "/app/fiscal-audits", label: "Defense fiscale", icon: FileWarning },
  { href: "/app/reminders", label: "Relances", icon: MailCheck },
  { href: "/app/work-queue", label: "File de travail", icon: ClipboardList },
  { href: "/app/reports", label: "Rapports", icon: BarChart3 },
  { href: "/app/proof-vault", label: "Preuves", icon: ShieldCheck },
  { href: "/app/billing", label: "Facturation", icon: CreditCard, billingOnly: true },
  { href: "/app/trash", label: "Corbeille", icon: Trash2 },
  { href: "/app/settings", label: "Parametres", icon: Settings },
  { href: "/app/help", label: "Aide", icon: LifeBuoy }
];

export function AppSidebar({ canUseBilling }: { canUseBilling: boolean }) {
  const pathname = usePathname();
  const visibleNav = nav.filter((item) => !item.billingOnly || canUseBilling);

  return (
    <nav className="grid gap-0.5" aria-label="Navigation cabinet">
      {visibleNav.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("app-shell-nav-link", active && "nav-link-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
