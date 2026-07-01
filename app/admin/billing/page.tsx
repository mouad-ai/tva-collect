import { prisma } from "@/lib/prisma";

export default async function AdminBillingPage() {
  const subscriptions = await prisma.firmSubscription.findMany({ include: { firm: true, plan: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-black">Billing admin</h1>
      <section className="card overflow-hidden">
        <table>
          <thead><tr><th>Cabinet</th><th>Plan</th><th>Statut</th><th>Essai fin</th></tr></thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td>{subscription.firm.name}</td>
                <td>{subscription.plan.name}</td>
                <td>{subscription.status}</td>
                <td>{subscription.trialEndsAt?.toLocaleDateString("fr-MA") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
