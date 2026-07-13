import { Prisma } from "@prisma/client";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export const metadata = { title: "Événements" };

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; eventType?: string; firmId?: string; page?: string; limit?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50, 100].includes(Number(params.limit)) ? Number(params.limit) : 25;
  const search = params.search?.trim();
  const where: Prisma.OperationalEventWhereInput = {
    firmId: params.firmId || undefined,
    eventType: params.eventType || undefined,
    OR: search ? [
      { eventTitle: { contains: search, mode: "insensitive" } },
      { eventDescription: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } }
    ] : undefined
  };
  const [eventTypes, firms, events, total] = await Promise.all([
    prisma.operationalEvent.findMany({
      distinct: ["eventType"],
      orderBy: { eventType: "asc" },
      select: { eventType: true }
    }),
    prisma.firm.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.operationalEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.operationalEvent.count({ where })
  ]);
  const firmNameById = new Map(firms.map((firm) => [firm.id, firm.name]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Audit events</h1>
        <p className="text-sm text-muted">Événements opérationnels de toutes les firmes.</p>
      </div>

      <section className="card p-4">
        <SearchFilterForm
          searchPlaceholder="Rechercher titre, source, acteur"
          filters={[
            { name: "eventType", label: "Type", value: params.eventType, options: [{ value: "", label: "Tous les types" }, ...eventTypes.map((item) => ({ value: item.eventType, label: item.eventType }))] },
            { name: "firmId", label: "Cabinet", value: params.firmId, options: [{ value: "", label: "Tous les cabinets" }, ...firms.map((firm) => ({ value: firm.id, label: firm.name }))] }
          ]}
        />
      </section>

      <section className="card min-w-0 overflow-hidden">
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cabinet</th>
                <th>Type</th>
                <th>Titre</th>
                <th>Acteur</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.occurredAt)}</td>
                  <td>{firmNameById.get(event.firmId) || event.firmId}</td>
                  <td>{event.eventType}</td>
                  <td>{event.eventTitle}</td>
                  <td>{event.actorType}</td>
                  <td>{event.source}</td>
                </tr>
              ))}
              {!events.length ? <tr><td colSpan={6}><EmptyState title="Aucun événement" description="Aucun audit ne correspond aux filtres." /></td></tr> : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
