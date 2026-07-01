import { prisma } from "@/lib/prisma";

export default async function AdminInvoicesPage() {
  const invoices = await prisma.billingInvoice.findMany({ include: { firm: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-black">Factures admin</h1>
      <section className="card overflow-hidden">
        <table>
          <thead><tr><th>Numero</th><th>Cabinet</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}><td>{invoice.invoiceNumber}</td><td>{invoice.firm.name}</td><td>{invoice.amountMad} MAD</td><td>{invoice.status}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
