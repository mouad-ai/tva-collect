import { UserRole } from "@prisma/client";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BillingPage() {
  const user = await requireAnyRole([UserRole.OWNER], { allowSuspended: true });
  const subscription = await prisma.firmSubscription.findUnique({
    where: { firmId: user.firmId },
    include: { plan: true, invoices: { orderBy: { createdAt: "desc" } } }
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Facturation</h1>
        <p className="text-sm text-muted">Plan, limites et factures du cabinet.</p>
      </div>
      <section className="card p-4">
        <h2 className="font-black">Plan actuel</h2>
        {subscription ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div><div className="text-sm text-muted">Plan</div><div className="font-black">{subscription.plan.name}</div></div>
            <div><div className="text-sm text-muted">Clients</div><div className="font-black">{subscription.plan.clientLimit}</div></div>
            <div><div className="text-sm text-muted">Utilisateurs</div><div className="font-black">{subscription.plan.userLimit}</div></div>
            <div><div className="text-sm text-muted">Stockage</div><div className="font-black">{subscription.plan.storageLimitMb} MB</div></div>
          </div>
        ) : <p className="text-muted">Aucun abonnement configure.</p>}
      </section>
      <section className="card overflow-hidden">
        <table>
          <thead><tr><th>Facture</th><th>Montant</th><th>Statut</th><th>Echeance</th></tr></thead>
          <tbody>
            {subscription?.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.amountMad} MAD</td>
                <td>{invoice.status}</td>
                <td>{invoice.dueDate.toLocaleDateString("fr-MA")}</td>
              </tr>
            ))}
            {!subscription?.invoices.length ? <tr><td colSpan={4} className="text-muted">Aucune facture.</td></tr> : null}
          </tbody>
        </table>
      </section>
      <section className="card p-4">
        <h2 className="font-black">Instructions de paiement</h2>
        <p className="mt-2 text-sm text-muted">Banque: a configurer · Titulaire: TVA Collect · RIB/IBAN: a configurer.</p>
      </section>
    </div>
  );
}
