import Link from "next/link";
import { notFound } from "next/navigation";
import { changeFirmSubscriptionPlanAction, extendFirmTrialAction } from "@/app/billing-actions";
import { reactivateFirm, suspendFirm } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { requireAdmin } from "@/lib/auth";
import { formatMad, getFirmBillingSnapshot, subscriptionStatusLabel, syncBillingLifecycle } from "@/lib/billing";
import { firmStatusLabel, planLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminFirmBillingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const firm = await prisma.firm.findUnique({ where: { id } });
  if (!firm) notFound();

  await syncBillingLifecycle(id);
  const snapshot = await getFirmBillingSnapshot(id);
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceMad: "asc" } });
  const events = await prisma.billingEvent.findMany({ where: { firmId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  const subscription = snapshot.subscription;

  return (
    <div className="content-stack">
      <PageHeader
        title={`Facturation - ${firm.name}`}
        description={`${planLabel(firm.plan)} - ${firmStatusLabel(firm.status)} - ${subscriptionStatusLabel(subscription?.status || "TRIAL")}`}
        actions={
          <>
            <Link href={`/admin/firms/${id}`} className="btn">Fiche cabinet</Link>
            <Link href="/admin/subscriptions" className="btn btn-primary">Abonnements</Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <form action={changeFirmSubscriptionPlanAction.bind(null, id)} className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Plan local</h2>
          <label>
            Plan
            <select name="plan" defaultValue={firm.plan}>
              {plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name} - {formatMad(plan.monthlyPriceMad)}</option>)}
            </select>
          </label>
          <PendingSubmitButton>Mettre a jour</PendingSubmitButton>
          <p className="text-xs text-muted">A utiliser seulement pour corriger le mapping local. Lemon reste la source de paiement.</p>
        </form>

        <form action={extendFirmTrialAction.bind(null, id)} className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Essai interne</h2>
          <label>Fin essai<input name="trialEndDate" type="date" defaultValue={firm.trialEndDate?.toISOString().slice(0, 10) || ""} /></label>
          <PendingSubmitButton>Prolonger</PendingSubmitButton>
        </form>

        <div className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Statut cabinet</h2>
          <p className="text-sm text-muted">Clients: {snapshot.usage.clients} - Utilisateurs: {snapshot.usage.users} - Collectes actives: {snapshot.usage.activeCollections}</p>
          <form action={suspendFirm.bind(null, id)} className="grid gap-2">
            <label>Raison suspension<textarea name="suspendedReason" rows={2} defaultValue={firm.suspendedReason || ""} /></label>
            <button className="btn" type="submit">Suspendre</button>
          </form>
          {firm.status === "SUSPENDED" || firm.status === "CANCELLED" ? (
            <form action={reactivateFirm.bind(null, id)}>
              <button className="btn btn-primary" type="submit">Reactiver</button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-extrabold">Subscription Lemon</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <p><strong>Status local:</strong> {subscription ? subscriptionStatusLabel(subscription.status) : "-"}</p>
            <p><strong>Status Lemon:</strong> {subscription?.lemonStatus || "-"}</p>
            <p><strong>Customer ID:</strong> {subscription?.lemonCustomerId || "-"}</p>
            <p><strong>Subscription ID:</strong> {subscription?.lemonSubscriptionId || "-"}</p>
            <p><strong>Variant ID:</strong> {subscription?.lemonVariantId || "-"}</p>
            <p><strong>Renouvellement:</strong> {formatDate(subscription?.renewsAt || subscription?.currentPeriodEnd)}</p>
            <p><strong>Fin acces:</strong> {formatDate(subscription?.endsAt)}</p>
            <p><strong>Carte:</strong> {subscription?.cardBrand && subscription.cardLastFour ? `${subscription.cardBrand} **** ${subscription.cardLastFour}` : "-"}</p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-extrabold">Portail client</h2>
          <div className="mt-4 grid gap-2">
            {subscription?.customerPortalUrl ? <a className="btn btn-primary" href={subscription.customerPortalUrl} target="_blank" rel="noreferrer">Ouvrir portail Lemon</a> : null}
            {subscription?.updatePaymentMethodUrl ? <a className="btn" href={subscription.updatePaymentMethodUrl} target="_blank" rel="noreferrer">Methode de paiement</a> : null}
            {!subscription?.customerPortalUrl && !subscription?.updatePaymentMethodUrl ? <p className="text-sm text-muted">Aucun lien Lemon synchronise pour le moment.</p> : null}
          </div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="font-extrabold">Webhooks de ce cabinet</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Evenement</th><th>Subscription</th><th>Traitement</th><th>Date</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.eventName}</td>
                  <td className="text-xs">{event.subscriptionId || "-"}</td>
                  <td>{event.processingError ? event.processingError : event.processedAt ? "Traite" : "Recu"}</td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
              {!events.length ? <tr><td colSpan={4} className="p-4 text-sm text-muted">Aucun webhook pour ce cabinet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
