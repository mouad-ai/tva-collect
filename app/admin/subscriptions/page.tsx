import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { getFirmUsage, overLimitReasons, subscriptionStatusLabel } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const subscriptions = await prisma.firmSubscription.findMany({
    include: { firm: true, plan: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const overLimitBySubscription = await Promise.all(
    subscriptions.map(async (subscription) => overLimitReasons(subscription.plan, await getFirmUsage(subscription.firmId)))
  );

  return (
    <div className="content-stack">
      <PageHeader title="Abonnements Lemon Squeezy" description="Statuts locaux synchronises depuis les webhooks Lemon Squeezy." actions={<Link href="/admin/billing" className="btn">Retour</Link>} />
      <section className="card min-w-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Cabinet</th><th>Fournisseur</th><th>Plan</th><th>Statut TVA</th><th>Statut Lemon</th><th>Renouvelle le</th><th>Usage</th><th>Subscription ID</th></tr></thead>
            <tbody>
              {subscriptions.map((subscription, index) => {
                const overLimit = overLimitBySubscription[index];
                return (
                  <tr key={subscription.id}>
                    <td><Link className="doc-dossier-link" href={`/admin/firms/${subscription.firmId}/billing`}>{subscription.firm.name}</Link></td>
                    <td>
                      <span className={cn("badge", subscription.provider === "LEMON_SQUEEZY" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700")}>
                        <span className="badge-dot" aria-hidden="true" />
                        {subscription.provider === "LEMON_SQUEEZY" ? "Lemon Squeezy" : "Manuel"}
                      </span>
                    </td>
                    <td>{subscription.plan.name}</td>
                    <td>{subscriptionStatusLabel(subscription.status)}</td>
                    <td>{subscription.lemonStatus || "-"}</td>
                    <td>{formatDate(subscription.renewsAt || subscription.currentPeriodEnd)}</td>
                    <td>
                      {overLimit.length ? (
                        <span className="badge border-amber-200 bg-amber-50 text-amber-800" title={overLimit.join(" · ")}>
                          <span className="badge-dot" aria-hidden="true" />
                          Au-dessus des limites
                        </span>
                      ) : (
                        <span className="text-xs text-muted">OK</span>
                      )}
                    </td>
                    <td className="text-xs">{subscription.lemonSubscriptionId || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
