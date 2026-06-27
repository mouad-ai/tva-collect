import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function ProofVaultPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; eventType?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [clients, eventTypes, events] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } }),
    prisma.operationalEvent.findMany({
      where: { firmId: user.firmId },
      distinct: ["eventType"],
      orderBy: { eventType: "asc" },
      select: { eventType: true }
    }),
    prisma.operationalEvent.findMany({
      where: {
        firmId: user.firmId,
        clientId: params.clientId || undefined,
        eventType: params.eventType || undefined
      },
      orderBy: { occurredAt: "desc" },
      take: 100
    })
  ]);
  const clientById = new Map(clients.map((client) => [client.id, client.companyName]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Proof Vault</h1>
        <p className="text-sm text-muted">Historique operationnel: demandes, relances, depots, controles et decisions.</p>
      </div>

      <section className="card p-4">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label>
            Client
            <select name="clientId" defaultValue={params.clientId || ""}>
              <option value="">Tous les clients</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
            </select>
          </label>
          <label>
            Type d&apos;evenement
            <select name="eventType" defaultValue={params.eventType || ""}>
              <option value="">Tous les types</option>
              {eventTypes.map((item) => <option key={item.eventType} value={item.eventType}>{item.eventType}</option>)}
            </select>
          </label>
          <button className="btn">Filtrer</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Timeline de preuve</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Evenement</th>
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
                <tr><td colSpan={6} className="text-muted">Aucun evenement trouve. Les prochains depots, relances et controles apparaitront ici.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
