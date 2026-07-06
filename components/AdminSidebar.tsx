"use client";

import { BarChart3, Building2, ClipboardList, CreditCard, MailCheck, Rocket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminInternalBase, hrefForBase } from "@/lib/routing";
import { cn } from "@/lib/utils";

const nav = [
  { path: "/", label: "Admin", icon: BarChart3 },
  { path: "/firms", label: "Cabinets", icon: Building2 },
  { path: "/billing", label: "Facturation", icon: CreditCard },
  { path: "/subscriptions", label: "Abonnements", icon: CreditCard },
  { path: "/billing-events", label: "Webhooks", icon: ClipboardList },
  { path: "/users", label: "Utilisateurs", icon: Users },
  { path: "/invites", label: "Invitations", icon: MailCheck },
  { path: "/leads", label: "Prospects", icon: Users },
  { path: "/events", label: "Evenements", icon: ClipboardList },
  { path: "/release-checklist", label: "Recette", icon: Rocket }
];

export function AdminSidebar({ basePath = adminInternalBase }: { basePath?: string }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-0.5" aria-label="Navigation administration">
      {nav.map((item) => {
        const Icon = item.icon;
        const href = hrefForBase(basePath, item.path);
        const internalHref = hrefForBase(adminInternalBase, item.path);
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
