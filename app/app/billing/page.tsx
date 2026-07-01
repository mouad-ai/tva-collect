import { AlertTriangle, ArrowRight, CreditCard, Download, FileText, HardDrive, Users } from "lucide-react";
import Link from "next/link";
import { InvoiceStatus, UserRole } from "@prisma/client";
import { requestBillingUpgradeAction, submitPaymentProofAction } from "@/app/billing-actions";
import { BillingInvoiceStatusBadge } from "@/components/BillingInvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PaymentProofForm } from "@/components/PaymentProofForm";
import { requireFirmAnyRole } from "@/lib/auth";
import {
  BillingSchemaUnavailableError,
  formatMad,
  getFirmBillingSnapshot,
  subscriptionStatusLabel,
  syncBillingLifecycle,
  usagePercent
} from "@/lib/billing";
import { firmStatusLabel, planLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { canAccessBilling } from "@/lib/security-policy";
import { cn, formatBytes, formatDate } from "@/lib/utils";

function usageFillClass(percent: number) {
  if (percent >= 90) return "usage-meter-fill-danger";
  if (percent >= 75) return "usage-meter-fill-warn";
  return "usage-meter-fill";
}

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; upgrade?: string; error?: string }>;
}) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (!canAccessBilling(user.role)) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted">Seuls le propriétaire et le responsable peuvent consulter la facturation.</p>
      </div>
    );
  }

  await syncBillingLifecycle(user.firmId).catch((error) => {
    if (error instanceof BillingSchemaUnavailableError) return;
    throw error;
  });

  let snapshot;
  try {
    snapshot = await getFirmBillingSnapshot(user.firmId);
  } catch (error) {
    if (error instanceof BillingSchemaUnavailableError) {
      return (
        <div className="content-stack">
          <PageHeader title="Facturation" description="Module facturation en cours d'initialisation." />
          <section className="card p-6">
            <h2 className="font-extrabold">Configuration requise</h2>
            <p className="mt-2 text-sm text-muted">
              La base de données facturation n&apos;est pas encore synchronisée avec le serveur en cours d&apos;exécution.
            </p>
            <pre className="mt-4 overflow-auto rounded-md border border-border bg-slate-50 p-4 text-sm">
{`npx prisma migrate deploy
npx prisma generate
npm run dev`}
            </pre>
            <p className="mt-3 text-sm text-muted">Puis rechargez cette page.</p>
          </section>
        </div>
      );
    }
    throw error;
  }

  const { firm, subscription, plan, settings, usage } = snapshot;
  const params = await searchParams;

  const invoices = await prisma.billingInvoice.findMany({
    where: { firmId: user.firmId },
    include: { receipt: true, paymentProofs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 24
  });

  const openInvoiceStatuses: InvoiceStatus[] = [
    InvoiceStatus.UNPAID,
    InvoiceStatus.ISSUED,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.PAYMENT_PROOF_SUBMITTED
  ];
  const openInvoice = invoices.find((invoice) => openInvoiceStatuses.includes(invoice.status));

  const clientLimit = plan?.clientLimit;
  const userLimit = plan?.userLimit;
  const storageLimitMb = plan?.storageLimitMb;
  const clientUsage = usagePercent(usage.clients, clientLimit);
  const userUsage = usagePercent(usage.users, userLimit);
  const storageUsage = usagePercent(usage.storageBytes, storageLimitMb ? storageLimitMb * 1024 * 1024 : null);
  const showOverdueBanner = firm.status === "OVERDUE" || subscription?.status === "PAST_DUE";

  return (
    <div className="content-stack">
      <PageHeader
        title="Facturation"
        description="Plan, quotas, factures et paiement manuel par virement, espèces ou chèque."
        actions={
          <Link href="/contact" className="btn">
            Contacter le support
          </Link>
        }
      />

      {params.submitted ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          Preuve de paiement envoyée. Notre équipe va la valider sous 24–48 h ouvrées.
        </div>
      ) : null}
      {params.upgrade ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
          Demande d&apos;upgrade envoyée. Nous vous recontacterons rapidement.
        </div>
      ) : null}
      {showOverdueBanner ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-start gap-2 font-bold text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Votre paiement est en retard. Merci de régulariser votre abonnement.
          </div>
          <p className="mt-2 text-amber-900">
            Vous pouvez toujours consulter cette page et soumettre une preuve de paiement. Au-delà de 15 jours, l&apos;accès opérationnel peut être suspendu.
          </p>
        </div>
      ) : null}
      {firm.status === "SUSPENDED" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
          Cabinet suspendu pour impayé. Régularisez la facture ouvert ci-dessous pour réactiver l&apos;accès.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <CreditCard size={15} aria-hidden="true" />
            Plan actuel
          </div>
          <div className="stat-card-value">{plan ? planLabel(plan.code) : planLabel(firm.plan)}</div>
          <div className="stat-card-note">{plan ? `${formatMad(plan.monthlyPriceMad)} / mois` : "Tarif à confirmer"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
              {firmStatusLabel(firm.status)}
            </span>
            {subscription ? (
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                {subscriptionStatusLabel(subscription.status)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Essai / période</div>
          <div className="mt-2 text-sm font-bold">
            {subscription?.trialEndsAt ? `Fin essai : ${formatDate(subscription.trialEndsAt)}` : "Essai non configuré"}
          </div>
          <div className="mt-2 text-sm text-muted">
            {subscription ? `Période courante : ${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}` : "Abonnement en cours de provisionnement"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Prochaine échéance</div>
          <div className="stat-card-value text-base">
            {openInvoice ? formatDate(openInvoice.dueDate) : subscription ? formatDate(subscription.currentPeriodEnd) : "—"}
          </div>
          <div className="stat-card-note">
            {openInvoice ? `Facture ${openInvoice.invoiceNumber}` : "Aucune facture ouverte"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><Users size={15} aria-hidden="true" />Clients</div>
          <div className="stat-card-value">{usage.clients}{clientLimit != null ? <span className="text-lg text-muted"> / {clientLimit}</span> : null}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(clientUsage))} style={{ width: `${clientUsage}%` }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><Users size={15} aria-hidden="true" />Utilisateurs</div>
          <div className="stat-card-value">{usage.users}{userLimit != null ? <span className="text-lg text-muted"> / {userLimit}</span> : null}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(userUsage))} style={{ width: `${userUsage}%` }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><HardDrive size={15} aria-hidden="true" />Stockage</div>
          <div className="stat-card-value">{formatBytes(usage.storageBytes)}</div>
          <div className="stat-card-note">{storageLimitMb ? `Limite ${storageLimitMb} Mo` : "Quota étendu"}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(storageUsage))} style={{ width: `${storageUsage}%` }} /></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-extrabold">Factures</h2>
            <p className="mt-1 text-sm text-muted">Historique des factures et reçus de paiement.</p>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Montant</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-bold">{invoice.invoiceNumber}</td>
                    <td>{formatMad(invoice.amountMad)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><BillingInvoiceStatusBadge status={invoice.status} /></td>
                    <td className="doc-actions-cell">
                      <a className="btn btn-compact" href={`/api/billing/invoices/${invoice.id}/print`} target="_blank" rel="noreferrer">
                        <Download size={14} aria-hidden="true" /> Facture
                      </a>
                      {invoice.receipt ? (
                        <a className="btn btn-compact" href={`/api/billing/receipts/${invoice.id}/print`} target="_blank" rel="noreferrer">
                          Reçu
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!invoices.length ? (
                  <tr><td colSpan={5} className="p-4 text-sm text-muted">Aucune facture émise pour le moment.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="grid gap-4 self-start">
          <div className="card p-4">
            <h2 className="font-extrabold">Instructions de paiement</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <p>{settings.paymentInstructions}</p>
              <p><strong>Banque :</strong> {settings.bankName}</p>
              <p><strong>Titulaire :</strong> {settings.accountHolder}</p>
              <p><strong>RIB :</strong> {settings.rib}</p>
              {settings.iban ? <p><strong>IBAN :</strong> {settings.iban}</p> : null}
              {openInvoice ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-900">
                  Référence à indiquer : {openInvoice.invoiceNumber}
                </p>
              ) : null}
              <p className="text-muted">{settings.supportEmail} {settings.supportWhatsapp ? `— WhatsApp ${settings.supportWhatsapp}` : ""}</p>
            </div>
          </div>

          {openInvoice &&
          (openInvoice.status === InvoiceStatus.UNPAID ||
            openInvoice.status === InvoiceStatus.ISSUED ||
            openInvoice.status === InvoiceStatus.OVERDUE) ? (
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <FileText size={16} aria-hidden="true" />
                <h2 className="font-extrabold">Envoyer une preuve</h2>
              </div>
              <p className="mt-2 text-sm text-muted">Téléversez le reçu de virement, capture bancaire ou photo du chèque.</p>
              <div className="mt-3">
                <PaymentProofForm invoiceId={openInvoice.id} defaultAmount={openInvoice.amountMad} action={submitPaymentProofAction} />
              </div>
            </div>
          ) : null}

          <div className="billing-plan-card">
            <h2 className="text-lg font-extrabold">Demander un upgrade</h2>
            <p className="mt-2 text-sm text-muted">Passez au plan Pro ou Premium pour plus de clients, d&apos;utilisateurs et de fonctionnalités.</p>
            <form action={requestBillingUpgradeAction} className="mt-4 grid gap-3">
              <label>
                Plan souhaité
                <select name="targetPlan" defaultValue="PRO">
                  <option value="PRO">Pro — 1 999 MAD / mois</option>
                  <option value="PREMIUM">Premium — sur devis</option>
                </select>
              </label>
              <label>
                Message (optionnel)
                <textarea name="message" rows={3} placeholder="Nombre de clients, besoins spécifiques..." />
              </label>
              <button className="btn btn-primary" type="submit">
                Envoyer la demande
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
}
