import { BarChart3, Bell, CircleHelp, LogOut, Search } from "lucide-react";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { hasAnyRole, requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireFirmUser();
  const canUseBilling = hasAnyRole(user, [UserRole.OWNER, UserRole.MANAGER]);
  const notificationState = await prisma.userNotificationState.findUnique({
    where: { userId: user.id },
    select: { lastSeenAt: true }
  });
  const unreadNotifications = await prisma.operationalEvent.count({
    where: {
      firmId: user.firmId,
      occurredAt: notificationState ? { gt: notificationState.lastSeenAt } : undefined
    }
  });

  return (
    <div className="app-shell">
      <header className="app-shell-header" role="banner">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link href="/app" className="app-shell-brand">
            <span className="app-shell-brand-mark">TVA</span>
            TVA Collect
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/search" className="btn" title="Recherche">
              <Search size={16} />
            </Link>
            <Link href="/app/notifications" className="btn relative" title="Notifications">
              <Bell size={16} />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
            <Link href="/app/help" className="btn" title="Aide">
              <CircleHelp size={16} />
            </Link>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <div className="font-semibold">{user.firm.name}</div>
              <div className="text-xs text-muted">{user.name}</div>
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
          <AppSidebar canUseBilling={canUseBilling} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
