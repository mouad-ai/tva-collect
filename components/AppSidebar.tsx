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
import { appInternalBase, hrefForBase } from "@/lib/routing";
import { cn } from "@/lib/utils";

const nav = [
  { path: "/", label: "Tableau de bord", icon: BarChart3 },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/collections", label: "Collectes TVA", icon: FolderKanban },
  { path: "/documents", label: "Documents", icon: FileText },
  { path: "/tva-readiness", label: "Preparation TVA", icon: ClipboardList },
  { path: "/tva-risk-register", label: "Risques TVA", icon: FileWarning },
  { path: "/tva-filing", label: "Declaration TVA", icon: ShieldCheck },
  { path: "/tva-portfolio-exposure", label: "Tresorerie TVA", icon: CreditCard },
  { path: "/fiscal-audits", label: "Defense fiscale", icon: FileWarning },
  { path: "/reminders", label: "Relances", icon: MailCheck },
  { path: "/work-queue", label: "File de travail", icon: ClipboardList },
  { path: "/reports", label: "Rapports", icon: BarChart3 },
  { path: "/proof-vault", label: "Preuves", icon: ShieldCheck },
  { path: "/billing", label: "Facturation", icon: CreditCard, billingOnly: true },
  { path: "/trash", label: "Corbeille", icon: Trash2 },
  { path: "/settings", label: "Parametres", icon: Settings },
  { path: "/help", label: "Aide", icon: LifeBuoy }
];

export function AppSidebar({ canUseBilling, basePath = appInternalBase }: { canUseBilling: boolean; basePath?: string }) {
  const pathname = usePathname();
  const visibleNav = nav.filter((item) => !item.billingOnly || canUseBilling);

  return (
    <nav className="grid gap-0.5" aria-label="Navigation cabinet">
      {visibleNav.map((item) => {
        const Icon = item.icon;
        const href = hrefForBase(basePath, item.path);
        const internalHref = hrefForBase(appInternalBase, item.path);
        const active =
          item.path === "/"
            ? pathname === href || pathname === internalHref
            : pathname === href || pathname.startsWith(`${href}/`) || pathname === internalHref || pathname.startsWith(`${internalHref}/`);
        return (
          <Link
            key={item.path}
            href={href}
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
