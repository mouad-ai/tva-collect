import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { BillingInvoiceStatusBadge } from "@/components/BillingInvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { formatMad, invoiceStatusLabel } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Factures" };

export default async function AdminInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status && Object.values(InvoiceStatus).includes(params.status as InvoiceStatus)
    ? (params.status as InvoiceStatus)
    : undefined;

  const invoices = await prisma.billingInvoice.findMany({
    where: { status },
    include: { firm: true, receipt: true, paymentProofs: { where: { status: "SUBMITTED" } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="content-stack">
      <PageHeader
        title="Factures"
        description="Suivi des factures manuelles, preuves soumises et paiements validés."
        actions={<Link href="/admin/billing" className="btn">Retour facturation</Link>}
      />

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4 flex flex-wrap gap-2">
          <Link href="/admin/invoices" className={!status ? "btn btn-primary" : "btn"}>Toutes</Link>
          {(["UNPAID", "PAYMENT_PROOF_SUBMITTED", "OVERDUE", "PAID", "DRAFT"] as InvoiceStatus[]).map((item) => (
            <Link key={item} href={`/admin/invoices?status=${item}`} className={status === item ? "btn btn-primary" : "btn"}>
              {invoiceStatusLabel(item)}
            </Link>
          ))}
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
                <th>Preuves</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-bold">{invoice.invoiceNumber}</td>
                  <td>{invoice.firm.name}</td>
                  <td>{formatMad(invoice.amountMad)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td><BillingInvoiceStatusBadge status={invoice.status} /></td>
                  <td>{invoice.paymentProofs.length ? `${invoice.paymentProofs.length} en attente` : invoice.receipt ? "Payée" : "—"}</td>
                  <td className="doc-actions-cell">
                    <Link href={`/admin/firms/${invoice.firmId}/billing`} className="btn btn-compact">Gérer</Link>
                    <a href={`/api/billing/invoices/${invoice.id}/print`} className="btn btn-compact" target="_blank" rel="noreferrer">PDF</a>
                  </td>
                </tr>
              ))}
              {!invoices.length ? <tr><td colSpan={7} className="p-4 text-sm text-muted">Aucune facture.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
