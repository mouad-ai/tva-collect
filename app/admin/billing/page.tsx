import Link from "next/link";
import { FirmStatus, InvoiceStatus } from "@prisma/client";
import { updatePlatformBillingSettingsAction } from "@/app/billing-actions";
import { BillingInvoiceStatusBadge } from "@/components/BillingInvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { formatMad, getPlatformBillingSettings, subscriptionStatusLabel } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminBillingPage() {
  await requireAdmin();
  const [settings, plans, subscriptions, invoices, firms] = await Promise.all([
    getPlatformBillingSettings(),
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceMad: "asc" } }),
    prisma.firmSubscription.findMany({ include: { plan: true, firm: true }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.billingInvoice.findMany({
      where: { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PAYMENT_PROOF_SUBMITTED] } },
      include: { firm: true },
      orderBy: { dueDate: "asc" },
      take: 12
    }),
    prisma.firm.count({ where: { status: { in: [FirmStatus.OVERDUE, FirmStatus.SUSPENDED] } } })
  ]);

  return (
    <div className="content-stack">
      <PageHeader
        title="Facturation SaaS"
        description="Plans, factures manuelles, validation des preuves et paramètres de paiement TVA Collect."
        actions={<Link href="/admin/invoices" className="btn btn-primary">Toutes les factures</Link>}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-label">Plans actifs</div>
          <div className="stat-card-value">{plans.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Factures à traiter</div>
          <div className="stat-card-value text-amber-700">{invoices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Cabinets en retard / suspendus</div>
          <div className="stat-card-value text-red-700">{firms}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Abonnements récents</div>
          <div className="stat-card-value">{subscriptions.length}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-extrabold">Factures ouvertes</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Cabinet</th>
                  <th>Montant</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><Link className="doc-dossier-link" href={`/admin/firms/${invoice.firmId}/billing`}>{invoice.invoiceNumber}</Link></td>
                    <td>{invoice.firm.name}</td>
                    <td>{formatMad(invoice.amountMad)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><BillingInvoiceStatusBadge status={invoice.status} /></td>
                  </tr>
                ))}
                {!invoices.length ? <tr><td colSpan={5} className="p-4 text-sm text-muted">Aucune facture ouverte.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-extrabold">Abonnements récents</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cabinet</th>
                  <th>Plan</th>
                  <th>Statut</th>
                  <th>Fin période</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td><Link className="doc-dossier-link" href={`/admin/firms/${subscription.firmId}/billing`}>{subscription.firm.name}</Link></td>
                    <td>{subscription.plan.name}</td>
                    <td>{subscriptionStatusLabel(subscription.status)}</td>
                    <td>{formatDate(subscription.currentPeriodEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Instructions de paiement (plateforme)</h2>
        <p className="mt-1 text-sm text-muted">Coordonnées bancaires affichées aux propriétaires de cabinets sur /app/billing.</p>
        <form action={updatePlatformBillingSettingsAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label>Banque<input name="bankName" defaultValue={settings.bankName || ""} /></label>
          <label>Titulaire<input name="accountHolder" defaultValue={settings.accountHolder || ""} /></label>
          <label>RIB<input name="rib" defaultValue={settings.rib || ""} /></label>
          <label>IBAN<input name="iban" defaultValue={settings.iban || ""} /></label>
          <label>Email support<input name="supportEmail" defaultValue={settings.supportEmail || ""} /></label>
          <label>WhatsApp support<input name="supportWhatsapp" defaultValue={settings.supportWhatsapp || ""} /></label>
          <label className="md:col-span-2">Instructions<textarea name="paymentInstructions" rows={3} defaultValue={settings.paymentInstructions || ""} /></label>
          <button className="btn btn-primary md:col-span-2">Enregistrer les coordonnées</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Grille tarifaire</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-md border border-border p-4">
              <div className="font-extrabold">{plan.name}</div>
              <div className="mt-1 text-2xl font-black">{formatMad(plan.monthlyPriceMad)}</div>
              <div className="mt-2 text-sm text-muted">
                {plan.clientLimit ?? "∞"} clients · {plan.userLimit ?? "∞"} utilisateurs
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
