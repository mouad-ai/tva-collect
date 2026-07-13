import { Bell } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { markNotificationsSeen } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const where = {
    firmId: user.firmId,
    eventType: params.type || undefined,
    OR: params.search ? [
      { eventTitle: { contains: params.search, mode: "insensitive" as const } },
      { eventDescription: { contains: params.search, mode: "insensitive" as const } }
    ] : undefined
  };
  const [events, total, eventTypes] = await Promise.all([
    prisma.operationalEvent.findMany({ where, orderBy: { occurredAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.operationalEvent.count({ where }),
    prisma.operationalEvent.findMany({ where: { firmId: user.firmId }, distinct: ["eventType"], select: { eventType: true }, orderBy: { eventType: "asc" } })
  ]);
  await markNotificationsSeen(user.id, user.firmId);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted">Activité récente du cabinet : dépôts, relances, validations et opérations importantes.</p>
      </div>

      <section className="card min-w-0 overflow-hidden">
        <SearchFilterForm
          searchPlaceholder="Rechercher une notification"
          filters={[{ name: "type", label: "Type", value: params.type, options: [{ value: "", label: "Tous" }, ...eventTypes.map((item) => ({ value: item.eventType, label: item.eventType }))] }]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!events.length ? (
          <div className="p-4">
            <EmptyState icon={Bell} title="Aucune notification" description="Les nouveaux dépôts, relances et actions importantes apparaîtront ici." />
          </div>
        ) : (
          <div className="grid divide-y divide-border">
            {events.map((event) => (
              <div key={event.id} className="grid gap-1 p-4 hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-extrabold">{event.eventTitle}</div>
                  <div className="text-xs font-bold text-muted">{formatDate(event.occurredAt)}</div>
                </div>
                <div className="text-sm text-muted">{event.eventDescription || event.eventType}</div>
                <div className="text-xs font-bold text-muted">{event.source}</div>
              </div>
            ))}
          </div>
        )}
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
