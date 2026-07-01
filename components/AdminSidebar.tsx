"use client";

import { BarChart3, Building2, ClipboardList, CreditCard, MailCheck, Rocket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Admin", icon: BarChart3 },
  { href: "/admin/firms", label: "Cabinets", icon: Building2 },
  { href: "/admin/billing", label: "Facturation", icon: CreditCard },
  { href: "/admin/invoices", label: "Factures", icon: CreditCard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/invites", label: "Invitations", icon: MailCheck },
  { href: "/admin/leads", label: "Prospects", icon: Users },
  { href: "/admin/events", label: "Événements", icon: ClipboardList },
  { href: "/admin/release-checklist", label: "Recette", icon: Rocket }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-0.5" aria-label="Navigation administration">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
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
