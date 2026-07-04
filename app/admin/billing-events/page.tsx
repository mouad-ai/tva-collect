import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminBillingEventsPage() {
  await requireAdmin();
  const events = await prisma.billingEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="content-stack">
      <PageHeader title="Webhooks Lemon Squeezy" description="Historique des evenements recus, traites et erreurs de processing." actions={<Link href="/admin/billing" className="btn">Retour</Link>} />
      <section className="card min-w-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Evenement</th><th>External ID</th><th>Firm</th><th>Subscription</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.eventName}</td>
                  <td className="text-xs">{event.externalEventId || "-"}</td>
                  <td className="text-xs">{event.firmId || "-"}</td>
                  <td className="text-xs">{event.subscriptionId || "-"}</td>
                  <td>{event.processingError ? event.processingError : event.processedAt ? "Traite" : "Recu"}</td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
              {!events.length ? <tr><td colSpan={6} className="p-4 text-sm text-muted">Aucun evenement Lemon Squeezy.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
