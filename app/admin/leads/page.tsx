import { Prisma } from "@prisma/client";
import { CalendarClock, Flame, PhoneCall, TrendingUp } from "lucide-react";
import { updateLeadAction } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireAdmin } from "@/lib/auth";
import { planLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { demoScriptForLead, isFollowUpOverdue, leadQualification, leadStages, pricingRecommendation, salesFollowUpMessage } from "@/lib/sales";
import { cn, formatDate } from "@/lib/utils";

const painLabel: Record<string, string> = {
  HIGH: "Élevé",
  MEDIUM: "Moyen",
  LOW: "Faible"
};

function dateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function stageLabel(value: string | null | undefined) {
  return leadStages.find((stage) => stage.value === value)?.label || value || "Nouveau";
}

export default async function AdminLeadsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; stage?: string; page?: string; limit?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const where: Prisma.LeadWhereInput = {
    stage: params.stage || undefined,
    OR: search ? [
      { firmName: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { leadSource: { contains: search, mode: "insensitive" } }
    ] : undefined
  };
  const [leads, total, allLeadsForStats] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({ select: { id: true, stage: true, createdAt: true, firmName: true, numberOfClients: true, numberOfAssistants: true, preferredDemoAt: true, nextFollowUpAt: true, expectedSetupFee: true, painLevel: true } })
  ]);
  const hotLeads = allLeadsForStats.filter((lead) => leadQualification(lead).score >= 65 && !["WON", "LOST"].includes(lead.stage));
  const overdueFollowUps = allLeadsForStats.filter((lead) => isFollowUpOverdue(lead));
  const demos = allLeadsForStats.filter((lead) => lead.stage === "DEMO_SCHEDULED" || lead.preferredDemoAt);
  const won = allLeadsForStats.filter((lead) => lead.stage === "WON").length;
  const lost = allLeadsForStats.filter((lead) => lead.stage === "LOST").length;
  const expectedSetupRevenue = allLeadsForStats.reduce((sum, lead) => {
    if (["WON", "LOST"].includes(lead.stage)) return sum;
    return sum + (lead.expectedSetupFee || pricingRecommendation(lead).setupFee);
  }, 0);
  const stageCounts = leadStages.map((stage) => ({
    ...stage,
    count: allLeadsForStats.filter((lead) => lead.stage === stage.value).length
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Suivi commercial</h1>
        <p className="text-sm text-muted">Suivi interne pour demos, pilotes, propositions et conversions.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><Flame size={16} /> Prospects chauds</div>
          <div className="mt-2 text-3xl font-black">{hotLeads.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><CalendarClock size={16} /> Suivis en retard</div>
          <div className="mt-2 text-3xl font-black">{overdueFollowUps.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><PhoneCall size={16} /> Demos</div>
          <div className="mt-2 text-3xl font-black">{demos.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><TrendingUp size={16} /> Mise en place potentielle</div>
          <div className="mt-2 text-3xl font-black">{expectedSetupRevenue} MAD</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4">
          <h2 className="font-black">Mission commerciale du jour</h2>
          <div className="mt-3 grid gap-2">
            {hotLeads.slice(0, 3).map((lead) => (
              <div key={lead.id} className="rounded-md border border-border p-3 text-sm">
                <span className="font-black">Appeler {lead.firmName}</span>
                <span className="text-muted"> - {leadQualification(lead).label}, {lead.numberOfClients || "?"} clients</span>
              </div>
            ))}
            {overdueFollowUps.slice(0, 3).map((lead) => (
              <div key={lead.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-black">Relancer {lead.firmName}</span>
                <span> - suivi prevu le {formatDate(lead.nextFollowUpAt)}</span>
              </div>
            ))}
            {!hotLeads.length && !overdueFollowUps.length ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                Aucun suivi commercial urgent.
              </div>
            ) : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-black">Suivi par etape</h2>
          <div className="mt-3 grid gap-2">
            {stageCounts.map((stage) => (
              <div key={stage.value} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="font-bold">{stage.label}</span>
                <span>{stage.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-muted">Gagnes : {won} - Perdus : {lost}</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <SearchFilterForm
          searchPlaceholder="Rechercher prospect, cabinet, ville, telephone"
          filters={[{ name: "stage", label: "Etape", value: params.stage, options: [{ value: "", label: "Toutes les etapes" }, ...leadStages.map((stage) => ({ value: stage.value, label: stage.label }))] }]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Score</th>
                <th>Etape</th>
                <th>Recommandation</th>
                <th>Demo / scenario</th>
                <th>Message</th>
                <th>Suivi</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const qualification = leadQualification(lead);
                const pricing = pricingRecommendation(lead);
                const script = demoScriptForLead(lead);
                return (
                  <tr key={lead.id}>
                    <td className="min-w-[220px] align-top">
                      <div className="font-black">{lead.firmName}</div>
                      <div>{lead.name}</div>
                      <div className="text-xs text-muted">{lead.phone} - {lead.email}</div>
                      <div className="mt-1 text-xs text-muted">{lead.city || "-"} - {lead.numberOfClients || "?"} clients - {lead.numberOfAssistants || 0} assistant(s)</div>
                      <div className="mt-1 text-xs text-muted">Source : {lead.leadSource || "-"}</div>
                    </td>
                    <td className="align-top">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", qualification.tone)}>
                        {qualification.score}/100 - {qualification.label}
                      </span>
                      <div className="mt-2 text-xs text-muted">{painLabel[lead.painLevel || "MEDIUM"] || lead.painLevel || "Moyen"}</div>
                    </td>
                    <td className="min-w-[160px] align-top">
                      <div className="font-bold">{stageLabel(lead.stage)}</div>
                      <div className="mt-1 text-xs text-muted">Cree le {formatDate(lead.createdAt)}</div>
                      {lead.preferredDemoAt ? <div className="mt-1 text-xs text-muted">Demo : {formatDate(lead.preferredDemoAt)}</div> : null}
                      {isFollowUpOverdue(lead) ? <div className="mt-2 text-xs font-black text-red-700">Suivi en retard</div> : null}
                    </td>
                    <td className="min-w-[220px] align-top text-sm">
                      <div className="font-black">{planLabel(pricing.plan)}</div>
                      <div>{pricing.price}</div>
                      <div>Mise en place : {pricing.setupFee} MAD</div>
                      <p className="mt-2 text-muted">{pricing.reason}</p>
                    </td>
                    <td className="min-w-[280px] align-top">
                      <ol className="grid gap-1 text-sm text-muted">
                        {script.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                      </ol>
                    </td>
                    <td className="min-w-[260px] align-top">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-muted">{salesFollowUpMessage(lead)}</pre>
                    </td>
                    <td className="min-w-[280px] align-top">
                      <form action={updateLeadAction.bind(null, lead.id)} className="grid gap-2">
                        <select name="stage" defaultValue={lead.stage}>
                          {leadStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                        </select>
                        <input name="nextFollowUpAt" type="date" defaultValue={dateInputValue(lead.nextFollowUpAt)} />
                        <input name="assignedOwner" placeholder="Responsable commercial" defaultValue={lead.assignedOwner || ""} />
                        <select name="expectedPlan" defaultValue={lead.expectedPlan || pricing.plan}>
                          <option value="Starter">Démarrage</option>
                          <option value="Pro">Pro</option>
                          <option value="Premium">Premium</option>
                        </select>
                        <input name="expectedSetupFee" type="number" placeholder="Frais de mise en place" defaultValue={lead.expectedSetupFee || pricing.setupFee} />
                        <textarea name="notes" rows={3} placeholder="Notes commerciales" defaultValue={lead.notes || ""} />
                        <button className="btn btn-primary">Enregistrer</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {!leads.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={search || params.stage ? "Aucun prospect trouvé" : "Aucun prospect pour le moment"}
                      description={
                        search || params.stage
                          ? "Essayez un autre nom, email, ville ou statut."
                          : "Les prospects arrivent automatiquement depuis les formulaires publics /contact et /demo du site."
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
