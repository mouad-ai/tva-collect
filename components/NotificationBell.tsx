"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const displayCount = pathname.startsWith("/app/notifications") || dismissed ? 0 : unreadCount;

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
    <Link href="/app/notifications" className="btn relative" title="Notifications" onClick={markSeen}>
      <Bell size={16} />
      {displayCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {displayCount > 9 ? "9+" : displayCount}
        </span>
      ) : null}
    </Link>
  );
}
