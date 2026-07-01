import Link from "next/link";
import { notFound } from "next/navigation";
import {
  changeFirmSubscriptionPlanAction,
  createBillingInvoiceAction,
  extendFirmTrialAction,
  issueBillingInvoiceAction,
  markBillingInvoicePaidAction,
  rejectPaymentProofAction
} from "@/app/billing-actions";
import { reactivateFirm, suspendFirm } from "@/app/actions";
import { BillingInvoiceStatusBadge } from "@/components/BillingInvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { requireAdmin } from "@/lib/auth";
import { formatMad, getFirmBillingSnapshot, subscriptionStatusLabel, syncBillingLifecycle } from "@/lib/billing";
import { firmStatusLabel, planLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminFirmBillingPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; paid?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const firm = await prisma.firm.findUnique({ where: { id } });
  if (!firm) notFound();

  await syncBillingLifecycle(id);
  const snapshot = await getFirmBillingSnapshot(id);
  const invoices = await prisma.billingInvoice.findMany({
    where: { firmId: id },
    include: {
      receipt: true,
      paymentProofs: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { createdAt: "desc" },
    take: 24
  });
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceMad: "asc" } });
  const defaultInvoiceDueDate = (snapshot.subscription?.currentPeriodEnd || firm.trialEndDate)?.toISOString().slice(0, 10) || "";

  return (
    <div className="content-stack">
      <PageHeader
        title={`Facturation — ${firm.name}`}
        description={`${planLabel(firm.plan)} · ${firmStatusLabel(firm.status)} · ${subscriptionStatusLabel(snapshot.subscription?.status || "TRIALING")}`}
        actions={
          <>
            <Link href={`/admin/firms/${id}`} className="btn">Fiche cabinet</Link>
            <Link href="/admin/invoices" className="btn btn-primary">Toutes les factures</Link>
          </>
        }
      />

      {query.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Facture créée.</div> : null}
      {query.paid ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Paiement validé et abonnement renouvelé.</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <form action={changeFirmSubscriptionPlanAction.bind(null, id)} className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Plan abonnement</h2>
          <label>
            Plan
            <select name="plan" defaultValue={firm.plan}>
              {plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name} — {formatMad(plan.monthlyPriceMad)}</option>)}
            </select>
          </label>
          <PendingSubmitButton>Mettre à jour le plan</PendingSubmitButton>
        </form>

        <form action={extendFirmTrialAction.bind(null, id)} className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Prolonger l&apos;essai</h2>
          <label>Fin essai<input name="trialEndDate" type="date" defaultValue={firm.trialEndDate?.toISOString().slice(0, 10) || ""} /></label>
          <PendingSubmitButton>Prolonger</PendingSubmitButton>
        </form>

        <div className="card grid gap-3 p-4">
          <h2 className="font-extrabold">Statut cabinet</h2>
          <p className="text-sm text-muted">Clients: {snapshot.usage.clients} · Utilisateurs: {snapshot.usage.users} · Collectes actives: {snapshot.usage.activeCollections}</p>
          <form action={suspendFirm.bind(null, id)} className="grid gap-2">
            <label>Raison suspension<textarea name="suspendedReason" rows={2} defaultValue={firm.suspendedReason || ""} /></label>
            <button className="btn" type="submit">Suspendre</button>
          </form>
          {firm.status === "SUSPENDED" || firm.status === "CANCELLED" ? (
            <form action={reactivateFirm.bind(null, id)}>
              <button className="btn btn-primary" type="submit">Réactiver</button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Créer une facture</h2>
        <form action={createBillingInvoiceAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_160px_180px_auto_auto] md:items-end">
          <input type="hidden" name="firmId" value={id} />
          <label>Montant MAD<input name="amountMad" type="number" defaultValue={snapshot.plan?.monthlyPriceMad || 1999} required /></label>
          <label>Échéance<input name="dueDate" type="date" required defaultValue={defaultInvoiceDueDate} /></label>
          <label>Notes<textarea name="notes" rows={1} placeholder="Période, remise..." /></label>
          <label className="flex flex-row items-center gap-2 pt-6">
            <input className="w-4" type="checkbox" name="issueNow" defaultChecked />
            Émettre maintenant
          </label>
          <PendingSubmitButton className="btn btn-primary">Créer facture</PendingSubmitButton>
        </form>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Factures & preuves</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Montant</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th>Actions admin</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const pendingProof = invoice.paymentProofs.find((proof) => proof.status === "SUBMITTED");
                return (
                  <tr key={invoice.id}>
                    <td className="font-bold">{invoice.invoiceNumber}</td>
                    <td>{formatMad(invoice.amountMad)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><BillingInvoiceStatusBadge status={invoice.status} /></td>
                    <td>
                      <div className="grid gap-2">
                        {invoice.status === "DRAFT" ? (
                          <form action={issueBillingInvoiceAction.bind(null, invoice.id)}>
                            <button className="btn btn-compact" type="submit">Émettre</button>
                          </form>
                        ) : null}
                        {pendingProof ? (
                          <div className="rounded-md border border-border p-3 text-sm">
                            <div className="font-bold">Preuve soumise — {pendingProof.method}</div>
                            {pendingProof.reference ? <div>Réf: {pendingProof.reference}</div> : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <form action={markBillingInvoicePaidAction.bind(null, invoice.id)} className="flex flex-wrap gap-2">
                                <select name="paymentMethod" defaultValue={pendingProof.method}>
                                  <option value="BANK_TRANSFER">Virement</option>
                                  <option value="CASH">Espèces</option>
                                  <option value="CHEQUE">Chèque</option>
                                  <option value="OTHER">Autre</option>
                                </select>
                                <input name="reference" placeholder="Référence" defaultValue={pendingProof.reference || ""} />
                                <PendingSubmitButton className="btn btn-compact btn-primary">Marquer payée</PendingSubmitButton>
                              </form>
                              <form action={rejectPaymentProofAction.bind(null, pendingProof.id)}>
                                <input type="hidden" name="adminComment" value="Preuve illisible ou montant incorrect." />
                                <button className="btn btn-compact" type="submit">Rejeter</button>
                              </form>
                            </div>
                          </div>
                        ) : null}
                        {!invoice.receipt && !pendingProof && invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
                          <form action={markBillingInvoicePaidAction.bind(null, invoice.id)} className="flex flex-wrap gap-2">
                            <select name="paymentMethod" defaultValue="BANK_TRANSFER">
                              <option value="BANK_TRANSFER">Virement</option>
                              <option value="CASH">Espèces</option>
                              <option value="CHEQUE">Chèque</option>
                            </select>
                            <input name="reference" placeholder="Référence" />
                            <PendingSubmitButton className="btn btn-compact btn-primary">Marquer payée</PendingSubmitButton>
                          </form>
                        ) : null}
                        {invoice.receipt ? (
                          <a className="btn btn-compact" href={`/api/billing/receipts/${invoice.id}/print`} target="_blank" rel="noreferrer">Reçu</a>
                        ) : null}
                        <a className="btn btn-compact" href={`/api/billing/invoices/${invoice.id}/print`} target="_blank" rel="noreferrer">Facture</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!invoices.length ? <tr><td colSpan={5} className="p-4 text-sm text-muted">Aucune facture pour ce cabinet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
