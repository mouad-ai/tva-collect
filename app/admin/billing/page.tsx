import Link from "next/link";
import { FirmStatus } from "@prisma/client";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { formatMad, subscriptionStatusLabel } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Facturation SaaS" };

export default async function AdminBillingPage() {
  await requireAdmin();
  const [plans, subscriptions, events, blockedFirms] = await Promise.all([
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceMad: "asc" } }),
    prisma.firmSubscription.findMany({ include: { plan: true, firm: true }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.firm.count({ where: { status: { in: [FirmStatus.OVERDUE, FirmStatus.SUSPENDED] } } })
  ]);
  const eventFirmIds = events.map((event) => event.firmId).filter((id): id is string => Boolean(id));
  const eventFirms = eventFirmIds.length ? await prisma.firm.findMany({ where: { id: { in: eventFirmIds } }, select: { id: true, name: true } }) : [];
  const eventFirmNameById = new Map(eventFirms.map((firm) => [firm.id, firm.name]));

  return (
    <div className="content-stack">
      <PageHeader
        title="Facturation SaaS"
        description="Contrôle Lemon Squeezy : abonnements, statuts locaux, variantes et webhooks."
        actions={
          <>
            <Link href="/admin/subscriptions" className="btn btn-primary">Abonnements</Link>
            <Link href="/admin/billing-events" className="btn">Webhooks</Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="stat-card"><div className="stat-card-label">Plans actifs</div><div className="stat-card-value">{plans.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Abonnements</div><div className="stat-card-value">{subscriptions.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Webhooks récents</div><div className="stat-card-value">{events.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Cabinets à surveiller</div><div className="stat-card-value text-red-700">{blockedFirms}</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="font-extrabold">Abonnements récents</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Cabinet</th><th>Plan</th><th>Statut</th><th>Renouvellement</th></tr></thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td><Link className="doc-dossier-link" href={`/admin/firms/${subscription.firmId}/billing`}>{subscription.firm.name}</Link></td>
                    <td>{subscription.plan.name}</td>
                    <td>{subscriptionStatusLabel(subscription.status)}<div className="text-xs text-muted">{subscription.lemonStatus || "-"}</div></td>
                    <td>{formatDate(subscription.renewsAt || subscription.currentPeriodEnd)}</td>
                  </tr>
                ))}
                {!subscriptions.length ? <tr><td colSpan={4} className="p-4 text-sm text-muted">Aucun abonnement.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="font-extrabold">Derniers webhooks Lemon</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Événement</th><th>Cabinet</th><th>Traitement</th><th>Date</th></tr></thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.eventName}</td>
                    <td>{event.firmId ? (eventFirmNameById.get(event.firmId) || event.firmId) : "-"}</td>
                    <td>{event.processingError ? "Erreur" : event.processedAt ? "Traité" : "Reçu"}</td>
                    <td>{formatDate(event.createdAt)}</td>
                  </tr>
                ))}
                {!events.length ? <tr><td colSpan={4} className="p-4 text-sm text-muted">Aucun webhook.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Plans Lemon Squeezy</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-md border border-border p-4">
              <div className="font-extrabold">{plan.name}</div>
              <div className="mt-1 text-2xl font-black">{formatMad(plan.monthlyPriceMad)}</div>
              <div className="mt-2 text-xs text-muted">
                Monthly variant: {plan.lemonMonthlyVariantId || "non configuré"}<br />
                Yearly variant: {plan.lemonYearlyVariantId || "non configuré"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
