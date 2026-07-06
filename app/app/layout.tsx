import { CircleHelp, LogOut, Search } from "lucide-react";
import { UserRole } from "@prisma/client";
import { headers } from "next/headers";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { getCurrentUser, hasAnyRole } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { appInternalBase, hrefForBase } from "@/lib/routing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname");
  const routeZone = headerStore.get("x-route-zone");
  const visibleBase = headerStore.get("x-visible-base") ?? appInternalBase;
  const isAppRoute = routeZone === "app" || Boolean(pathname?.startsWith(appInternalBase));
  if (!isAppRoute) return <>{children}</>;

  const user = await getCurrentUser();
  if (user?.role === UserRole.ADMIN || !user?.firmId || !user.firm) return <>{children}</>;

  const canUseBilling = hasAnyRole(user, [UserRole.OWNER, UserRole.MANAGER]);
  const unreadNotifications = await getUnreadNotificationCount(user.id, user.firmId);

  return (
    <div className="app-shell">
      <header className="app-shell-header" role="banner">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link href={hrefForBase(visibleBase, "/")} className="app-shell-brand">
            <span className="app-shell-brand-mark">TVA</span>
            TVA Collect
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={hrefForBase(visibleBase, "/search")} className="btn" title="Recherche">
              <Search size={16} />
            </Link>
            <NotificationBell key={unreadNotifications} unreadCount={unreadNotifications} basePath={visibleBase} />
            <Link href={hrefForBase(visibleBase, "/help")} className="btn" title="Aide">
              <CircleHelp size={16} />
            </Link>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <div className="font-semibold">{user.firm.name}</div>
              <div className="text-xs text-muted">{user.name}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn" type="submit">
                <LogOut size={16} />
                Deconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[232px_1fr]">
        <aside className="card app-shell-sidebar h-fit">
          <AppSidebar canUseBilling={canUseBilling} basePath={visibleBase} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
