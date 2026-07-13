import { Prisma } from "@prisma/client";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function ProofVaultPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; clientId?: string; eventType?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50, 100].includes(Number(params.limit)) ? Number(params.limit) : 25;
  const search = params.search?.trim();
  const where: Prisma.OperationalEventWhereInput = {
    firmId: user.firmId,
    clientId: params.clientId || undefined,
    eventType: params.eventType || undefined,
    OR: search ? [
      { eventTitle: { contains: search, mode: "insensitive" } },
      { eventDescription: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } }
    ] : undefined
  };
  const [clients, eventTypes, events, total] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } }),
    prisma.operationalEvent.findMany({
      where: { firmId: user.firmId },
      distinct: ["eventType"],
      orderBy: { eventType: "asc" },
      select: { eventType: true }
    }),
    prisma.operationalEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.operationalEvent.count({ where })
  ]);
  const clientById = new Map(clients.map((client) => [client.id, client.companyName]));

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Coffre de preuves</h1>
        <p className="text-sm text-muted">Historique opérationnel : demandes, relances, dépôts, contrôles et décisions.</p>
      </div>

      <section className="card p-4">
        <SearchFilterForm
          searchPlaceholder="Rechercher preuve, source, détail"
          filters={[
            { name: "clientId", label: "Client", value: params.clientId, options: [{ value: "", label: "Tous les clients" }, ...clients.map((client) => ({ value: client.id, label: client.companyName }))] },
            { name: "eventType", label: "Type", value: params.eventType, options: [{ value: "", label: "Tous les types" }, ...eventTypes.map((item) => ({ value: item.eventType, label: item.eventType }))] }
          ]}
        />
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Timeline de preuve</h2>
        </div>
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Événement</th>
                <th>Client</th>
                <th>Source</th>
                <th>Acteur</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="min-w-[160px]">{formatDateTime(event.occurredAt)}</td>
                  <td className="min-w-[220px]">
                    <div className="font-bold">{event.eventTitle}</div>
                    <div className="text-xs text-muted">{event.eventType}</div>
                  </td>
                  <td>
                    {event.clientId ? (
                      <Link className="font-bold" href={`/app/clients/${event.clientId}`}>
                        {clientById.get(event.clientId) || "Client"}
                      </Link>
                    ) : "-"}
                  </td>
                  <td>{event.source}</td>
                  <td>{event.actorType}</td>
                  <td className="min-w-[260px]">
                    <div className="text-sm">{event.eventDescription || "-"}</div>
                    {event.collectionId ? (
                      <Link className="mt-1 inline-block text-xs font-bold text-primary" href={`/app/collections/${event.collectionId}`}>
                        Ouvrir la collecte
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!events.length ? (
                <tr><td colSpan={6}><EmptyState title="Aucun événement trouvé" description="Les prochains dépôts, relances et contrôles apparaîtront ici." /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

