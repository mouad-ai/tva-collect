import { CalendarClock, Flame, PhoneCall, TrendingUp } from "lucide-react";
import { updateLeadAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoScriptForLead, isFollowUpOverdue, leadQualification, leadStages, pricingRecommendation, salesFollowUpMessage } from "@/lib/sales";
import { cn, formatDate } from "@/lib/utils";

function dateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function stageLabel(value: string | null | undefined) {
  return leadStages.find((stage) => stage.value === value)?.label || value || "New";
}

export default async function AdminLeadsPage() {
  await requireAdmin();
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const hotLeads = leads.filter((lead) => leadQualification(lead).score >= 65 && !["WON", "LOST"].includes(lead.stage));
  const overdueFollowUps = leads.filter((lead) => isFollowUpOverdue(lead));
  const demos = leads.filter((lead) => lead.stage === "DEMO_SCHEDULED" || lead.preferredDemoAt);
  const won = leads.filter((lead) => lead.stage === "WON").length;
  const lost = leads.filter((lead) => lead.stage === "LOST").length;
  const expectedSetupRevenue = leads.reduce((sum, lead) => {
    if (["WON", "LOST"].includes(lead.stage)) return sum;
    return sum + (lead.expectedSetupFee || pricingRecommendation(lead).setupFee);
  }, 0);
  const stageCounts = leadStages.map((stage) => ({
    ...stage,
    count: leads.filter((lead) => lead.stage === stage.value).length
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Sales CRM</h1>
        <p className="text-sm text-muted">Pipeline interne pour demos, pilotes, propositions et conversions.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><Flame size={16} /> Hot leads</div>
          <div className="mt-2 text-3xl font-black">{hotLeads.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><CalendarClock size={16} /> Follow-ups en retard</div>
          <div className="mt-2 text-3xl font-black">{overdueFollowUps.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><PhoneCall size={16} /> Demos</div>
          <div className="mt-2 text-3xl font-black">{demos.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><TrendingUp size={16} /> Setup potentiel</div>
          <div className="mt-2 text-3xl font-black">{expectedSetupRevenue} MAD</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4">
          <h2 className="font-black">Founder daily sales mission</h2>
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
          <h2 className="font-black">Pipeline par stage</h2>
          <div className="mt-3 grid gap-2">
            {stageCounts.map((stage) => (
              <div key={stage.value} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="font-bold">{stage.label}</span>
                <span>{stage.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-muted">Won: {won} - Lost: {lost}</div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Score</th>
                <th>Pipeline</th>
                <th>Reco</th>
                <th>Demo / script</th>
                <th>Message</th>
                <th>CRM</th>
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
                      <div className="mt-1 text-xs text-muted">Source: {lead.leadSource || "-"}</div>
                    </td>
                    <td className="align-top">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", qualification.tone)}>
                        {qualification.score}/100 - {qualification.label}
                      </span>
                      <div className="mt-2 text-xs text-muted">{lead.painLevel || "MEDIUM"}</div>
                    </td>
                    <td className="min-w-[160px] align-top">
                      <div className="font-bold">{stageLabel(lead.stage)}</div>
                      <div className="mt-1 text-xs text-muted">Cree le {formatDate(lead.createdAt)}</div>
                      {lead.preferredDemoAt ? <div className="mt-1 text-xs text-muted">Demo: {formatDate(lead.preferredDemoAt)}</div> : null}
                      {isFollowUpOverdue(lead) ? <div className="mt-2 text-xs font-black text-red-700">Follow-up en retard</div> : null}
                    </td>
                    <td className="min-w-[220px] align-top text-sm">
                      <div className="font-black">{pricing.plan}</div>
                      <div>{pricing.price}</div>
                      <div>Setup: {pricing.setupFee} MAD</div>
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
                        <input name="assignedOwner" placeholder="Owner sales" defaultValue={lead.assignedOwner || ""} />
                        <select name="expectedPlan" defaultValue={lead.expectedPlan || pricing.plan}>
                          <option>Starter</option>
                          <option>Pro</option>
                          <option>Premium</option>
                        </select>
                        <input name="expectedSetupFee" type="number" placeholder="Setup fee" defaultValue={lead.expectedSetupFee || pricing.setupFee} />
                        <textarea name="notes" rows={3} placeholder="Notes commerciales" defaultValue={lead.notes || ""} />
                        <button className="btn btn-primary">Sauver</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {!leads.length ? <tr><td colSpan={7} className="text-muted">Aucun lead pour le moment.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
