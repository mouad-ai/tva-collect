import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<{ eventType?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [eventTypes, events] = await Promise.all([
    prisma.operationalEvent.findMany({
      distinct: ["eventType"],
      orderBy: { eventType: "asc" },
      select: { eventType: true }
    }),
    prisma.operationalEvent.findMany({
      where: { eventType: params.eventType || undefined },
      orderBy: { occurredAt: "desc" },
      take: 150
    })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Audit events</h1>
        <p className="text-sm text-muted">Evenements operationnels de toutes les firmes.</p>
      </div>

      <section className="card p-4">
        <form className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label>
            Type
            <select name="eventType" defaultValue={params.eventType || ""}>
              <option value="">Tous les types</option>
              {eventTypes.map((item) => <option key={item.eventType} value={item.eventType}>{item.eventType}</option>)}
            </select>
          </label>
          <button className="btn">Filtrer</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Firm</th>
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
                  <td>{event.firmId}</td>
                  <td>{event.eventType}</td>
                  <td>{event.eventTitle}</td>
                  <td>{event.actorType}</td>
                  <td>{event.source}</td>
                </tr>
              ))}
              {!events.length ? <tr><td colSpan={6} className="text-muted">Aucun evenement.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
