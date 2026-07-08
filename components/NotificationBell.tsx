"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appInternalBase, hrefForBase } from "@/lib/routing";

export function NotificationBell({ unreadCount, basePath = appInternalBase }: { unreadCount: number; basePath?: string }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const notificationsHref = hrefForBase(basePath, "/notifications");
  const internalNotificationsHref = hrefForBase(appInternalBase, "/notifications");
  const displayCount = pathname.startsWith(notificationsHref) || pathname.startsWith(internalNotificationsHref) || dismissed ? 0 : unreadCount;

  function markSeen() {
    setDismissed(true);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/notifications/seen");
      return;
    }
    void fetch("/api/notifications/seen", {
      method: "POST",
      keepalive: true
    });
  }

  return (
    <Link href={notificationsHref} className="btn btn-icon relative" title="Notifications" aria-label="Notifications" onClick={markSeen}>
      <Bell size={16} />
      {displayCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {displayCount > 9 ? "9+" : displayCount}
        </span>
      ) : null}
    </Link>
  );
}
