import { ArrowRight, CreditCard, ExternalLink, HardDrive, Users } from "lucide-react";
import { UserRole } from "@prisma/client";
import { CheckoutButton } from "@/components/CheckoutButton";
import { PageHeader } from "@/components/PageHeader";
import { requireFirmAnyRole } from "@/lib/auth";
import { supportEmail } from "@/lib/constants";
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
  searchParams: Promise<{ checkout?: string; upgrade?: string; error?: string }>;
}) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (!canAccessBilling(user.role)) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Acces reserve</h1>
        <p className="mt-2 text-sm text-muted">Seuls le proprietaire et le manager peuvent consulter la facturation.</p>
      </div>
    );
  }

  await syncBillingLifecycle(user.firmId).catch((error) => {
    if (error instanceof BillingSchemaUnavailableError) return;
    throw error;
  });

  const params = await searchParams;
  const snapshot = await getFirmBillingSnapshot(user.firmId);
  const { firm, subscription, plan, usage } = snapshot;
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceMad: "asc" } });
  const clientUsage = usagePercent(usage.clients, plan?.clientLimit);
  const userUsage = usagePercent(usage.users, plan?.userLimit);
  const storageUsage = usagePercent(usage.storageBytes, plan?.storageLimitMb ? plan.storageLimitMb * 1024 * 1024 : null);
  const showOverdueBanner = firm.status === "OVERDUE" || subscription?.status === "OVERDUE" || subscription?.status === "PAST_DUE";

  return (
    <div className="content-stack">
      <PageHeader
        title="Facturation"
        description="Abonnement, limites et portail Lemon Squeezy."
        actions={<a href={`mailto:${supportEmail}`} className="btn">Contacter le support</a>}
      />

      {params.checkout === "success" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          Paiement recu par Lemon Squeezy. L&apos;abonnement sera active des reception du webhook verifie.
        </div>
      ) : null}
      {showOverdueBanner ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Paiement en retard. Mettez a jour votre methode de paiement depuis Lemon Squeezy pour eviter une suspension.
        </div>
      ) : null}
      {firm.status === "SUSPENDED" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
          Cabinet suspendu. Vous pouvez encore gerer la facturation et mettre a jour le paiement.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><CreditCard size={15} /> Plan actuel</div>
          <div className="stat-card-value">{plan ? planLabel(plan.code) : planLabel(firm.plan)}</div>
          <div className="stat-card-note">{plan ? `${formatMad(plan.monthlyPriceMad)} / mois` : "Tarif a confirmer"}</div>
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
          <div className="stat-card-label">Renouvellement</div>
          <div className="mt-2 text-sm font-bold">
            {subscription?.renewsAt ? formatDate(subscription.renewsAt) : subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "Non synchronise"}
          </div>
          <div className="mt-2 text-sm text-muted">
            {subscription?.endsAt ? `Fin d'acces: ${formatDate(subscription.endsAt)}` : "Gere par Lemon Squeezy"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Carte</div>
          <div className="stat-card-value text-base">
            {subscription?.cardBrand && subscription.cardLastFour ? `${subscription.cardBrand} **** ${subscription.cardLastFour}` : "Non disponible"}
          </div>
          <div className="stat-card-note">Les factures et recus sont dans le portail Lemon Squeezy.</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><Users size={15} />Clients</div>
          <div className="stat-card-value">{usage.clients}{plan?.clientLimit != null ? <span className="text-lg text-muted"> / {plan.clientLimit}</span> : null}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(clientUsage))} style={{ width: `${clientUsage}%` }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><Users size={15} />Utilisateurs</div>
          <div className="stat-card-value">{usage.users}{plan?.userLimit != null ? <span className="text-lg text-muted"> / {plan.userLimit}</span> : null}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(userUsage))} style={{ width: `${userUsage}%` }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2"><HardDrive size={15} />Stockage</div>
          <div className="stat-card-value">{formatBytes(usage.storageBytes)}</div>
          <div className="stat-card-note">{plan?.storageLimitMb ? `Limite ${plan.storageLimitMb} Mo` : "Quota etendu"}</div>
          <div className="usage-meter"><div className={cn("usage-meter-fill", usageFillClass(storageUsage))} style={{ width: `${storageUsage}%` }} /></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-extrabold">Changer d&apos;abonnement</h2>
            <p className="mt-1 text-sm text-muted">Le checkout, la carte, les factures et le portail client sont geres par Lemon Squeezy.</p>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {plans.map((item) => (
              <div key={item.id} className="billing-plan-card">
                <h3 className="text-lg font-extrabold">{planLabel(item.code)}</h3>
                <div className="mt-2 text-3xl font-black">{formatMad(item.monthlyPriceMad)}</div>
                <p className="mt-2 text-sm text-muted">
                  {item.clientLimit ?? "Illimite"} clients - {item.userLimit ?? "Illimite"} utilisateurs
                </p>
                <div className="mt-4 grid gap-2">
                  {item.lemonMonthlyVariantId ? (
                    <CheckoutButton planCode={item.code} interval="monthly">
                      Mensuel <ArrowRight size={16} />
                    </CheckoutButton>
                  ) : <div className="text-xs font-bold text-muted">Mensuel non configure</div>}
                  {item.lemonYearlyVariantId ? (
                    <CheckoutButton planCode={item.code} interval="yearly" className="btn">
                      Annuel <ArrowRight size={16} />
                    </CheckoutButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-4 self-start">
          <div className="card p-4">
            <h2 className="font-extrabold">Portail Lemon Squeezy</h2>
            <p className="mt-2 text-sm text-muted">Utilisez le portail pour voir les factures, changer la carte ou annuler l&apos;abonnement.</p>
            <div className="mt-4 grid gap-2">
              {subscription?.customerPortalUrl ? (
                <a className="btn btn-primary" href={subscription.customerPortalUrl} target="_blank" rel="noreferrer">
                  Gerer l&apos;abonnement <ExternalLink size={16} />
                </a>
              ) : null}
              {subscription?.updatePaymentMethodUrl ? (
                <a className="btn" href={subscription.updatePaymentMethodUrl} target="_blank" rel="noreferrer">
                  Mettre a jour la carte <ExternalLink size={16} />
                </a>
              ) : null}
              {!subscription?.customerPortalUrl && !subscription?.updatePaymentMethodUrl ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                  Le portail sera disponible après la mise en place du paiement en ligne. Contactez le support pour un paiement par virement.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
