import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [firms, users, clients, documents, leads, recentEvents] = await Promise.all([
    prisma.firm.count(),
    prisma.user.count(),
    prisma.client.count(),
    prisma.uploadedDocument.findMany({ select: { size: true } }),
    prisma.lead.count(),
    prisma.operationalEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 8 })
  ]);
  const storage = documents.reduce((sum, document) => sum + document.size, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Admin dashboard</h1>
        <p className="text-sm text-muted">Vue interne SaaS: firmes, usage, leads et activite.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Firms", firms],
          ["Users", users],
          ["Clients", clients],
          ["Documents", documents.length],
          ["Leads", leads]
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-sm font-bold text-muted">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="card p-4">
        <div className="text-sm font-bold text-muted">Stockage total</div>
        <div className="mt-2 text-3xl font-black">{formatBytes(storage)}</div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-black">Activite recente</h2>
          <Link href="/admin/events" className="btn">Voir events</Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Titre</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.occurredAt)}</td>
                  <td>{event.eventType}</td>
                  <td>{event.eventTitle}</td>
                  <td>{event.source}</td>
                </tr>
              ))}
              {!recentEvents.length ? <tr><td colSpan={4} className="text-muted">Aucun evenement pour le moment.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
