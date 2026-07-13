import { AlertTriangle, ArrowRight, Banknote, CalendarClock, ChevronRight, FileSearch, TrendingUp } from "lucide-react";
import Link from "next/link";
import { AdvisoryConfidenceBadge, AdvisoryRiskBadge } from "@/components/AdvisoryBadges";
import { EmptyState } from "@/components/EmptyState";
import { FilingStatusBadge } from "@/components/FilingStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  advisoryCategoryLabel,
  advisoryRiskLabel,
  advisorySeverityLabel,
  advisorySeverityTone,
  buildTvaAdvisoryPortfolio,
  formatMad
} from "@/lib/tva-advisory";
import { deadlineWarning, paymentStatusLabel, paymentStatusTone } from "@/lib/tva-filing";
import { cn, formatDate } from "@/lib/utils";

const deadlineToneClass = {
  CRITICAL: "deadline-critical",
  HIGH: "deadline-high",
  MEDIUM: "deadline-medium",
  LOW: "deadline-low"
} as const;

const portfolioRiskTone = (score: number) =>
  score >= 70 ? "text-red-700" : score >= 45 ? "text-orange-700" : score >= 20 ? "text-amber-700" : "text-emerald-700";

export const metadata = { title: "Trésorerie TVA" };

export default async function TvaPortfolioExposurePage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; risk?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim().toLowerCase();

  const filingCases = await prisma.tvaFilingCase.findMany({
    where: { firmId: user.firmId },
    orderBy: [{ paymentDeadline: "asc" }, { createdAt: "desc" }],
    take: 250
  });

  const clientCollectionIds = filingCases.map((item) => item.clientCollectionId);
  const filingCaseIds = filingCases.map((item) => item.id);

  const [payments, clientCollections, auditCases] = await Promise.all([
    prisma.tvaPayment.findMany({ where: { firmId: user.firmId, filingCaseId: { in: filingCaseIds } } }),
    prisma.clientCollection.findMany({
      where: { firmId: user.firmId, id: { in: clientCollectionIds } },
      include: {
        client: { select: { companyName: true, phone: true, email: true } },
        requiredDocuments: true,
        uploadedDocuments: true
      }
    }),
    prisma.fiscalAuditCase.groupBy({
      by: ["relatedFilingCaseId"],
      where: { firmId: user.firmId, relatedFilingCaseId: { in: filingCaseIds } },
      _count: { _all: true }
    })
  ]);

  const auditCasesByFilingCaseId = new Map(
    auditCases
      .filter((item) => item.relatedFilingCaseId)
      .map((item) => [item.relatedFilingCaseId as string, item._count._all])
  );

  const portfolio = buildTvaAdvisoryPortfolio({
    filingCases,
    payments,
    clientCollections,
    auditCasesByFilingCaseId
  });

  const filteredRows = portfolio.rows.filter((row) => {
    const matchesRisk = params.risk ? row.riskLevel === params.risk : true;
    const matchesSearch = search
      ? `${row.clientName} ${row.clientContact} ${row.periodLabel} ${row.sourceLabel}`.toLowerCase().includes(search)
      : true;
    return matchesRisk && matchesSearch;
  });

  const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit);
  const hasActiveFilters = Boolean(search || params.risk);

  return (
    <div className="content-stack">
      <PageHeader
        title="Trésorerie TVA"
        description="Exposition TVA du portefeuille, risques de paiement, pièces déductibles et recommandations cabinet."
        actions={
          <Link href="/app/tva-filing" className="btn btn-primary">
            Déclarations TVA
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <Banknote size={15} aria-hidden="true" />
            TVA estimée ouverte
          </div>
          <div className="stat-card-value">{formatMad(portfolio.summary.totalEstimatedNetTva)}</div>
          <div className="stat-card-note">Base : montants saisis ou historique récent</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <TrendingUp size={15} aria-hidden="true" />
            Reste à préparer
          </div>
          <div className="stat-card-value text-blue-700">{formatMad(portfolio.summary.totalRemaining)}</div>
          <div className="stat-card-note">{formatMad(portfolio.summary.totalConfirmedDue)} confirmé(s)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <CalendarClock size={15} aria-hidden="true" />
            Échéances 7 jours
          </div>
          <div className="stat-card-value text-amber-700">{portfolio.summary.dueSoonCount}</div>
          <div className="stat-card-note">{portfolio.summary.lateCount} paiement(s) déjà en retard</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <AlertTriangle size={15} aria-hidden="true" />
            Score risque portefeuille
          </div>
          <div className={cn("stat-card-value", portfolioRiskTone(portfolio.summary.portfolioRiskScore))}>
            {portfolio.summary.portfolioRiskScore}/100
          </div>
          <div className="stat-card-note">{portfolio.summary.riskLabel}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-extrabold">Portefeuille TVA</h2>
            <p className="mt-1 text-sm text-muted">
              {hasActiveFilters
                ? `${filteredRows.length} dossier(s) correspondant aux filtres actifs.`
                : "Clients classés par risque trésorerie, échéance et fiabilité des données."}
            </p>
          </div>

          <SearchFilterForm
            searchPlaceholder="Rechercher client, période, source"
            filters={[{
              name: "risk",
              label: "Risque",
              value: params.risk,
              options: [
                { value: "", label: "Tous les risques" },
                { value: "CRITICAL", label: advisoryRiskLabel.CRITICAL },
                { value: "HIGH", label: advisoryRiskLabel.HIGH },
                { value: "MEDIUM", label: advisoryRiskLabel.MEDIUM },
                { value: "LOW", label: advisoryRiskLabel.LOW }
              ]
            }]}
          />

          <PaginationControls total={filteredRows.length} page={page} limit={limit} searchParams={params} />

          {!paginatedRows.length ? (
            <div className="p-4">
              <EmptyState
                icon={Banknote}
                title={hasActiveFilters ? "Aucun dossier trouvé" : "Aucun dossier TVA"}
                description={
                  hasActiveFilters
                    ? "Essayez d'élargir les filtres ou de réinitialiser la recherche."
                    : "Créez des dossiers de déclaration TVA pour alimenter l'analyse de trésorerie."
                }
                actionHref={hasActiveFilters ? "/app/tva-portfolio-exposure" : "/app/tva-filing"}
                actionLabel={hasActiveFilters ? "Effacer les filtres" : "Ouvrir les déclarations"}
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Période</th>
                    <th>TVA estimée</th>
                    <th>Paiement</th>
                    <th>Confiance</th>
                    <th>Risque</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => {
                    const paymentDeadline = deadlineWarning(row.paymentDeadline);

                    return (
                      <tr key={row.filingCaseId}>
                        <td className="doc-dossier-cell">
                          <Link href={`/app/clients/${row.clientId}`} className="doc-dossier-link">
                            {row.clientName}
                          </Link>
                          <div className="doc-dossier-context">{row.clientContact || "—"}</div>
                        </td>
                        <td>
                          <div className="font-bold">{row.periodLabel}</div>
                          <div className="mt-1">
                            <FilingStatusBadge status={row.filingStatus} />
                          </div>
                        </td>
                        <td>
                          <div className="exposure-money-cell">{formatMad(row.estimatedNetTva)}</div>
                          <div className="doc-dossier-context">{row.sourceLabel}</div>
                          {row.variancePercent != null ? (
                            <div className={cn("mt-1 text-xs font-semibold", Math.abs(row.variancePercent) >= 50 ? "text-orange-700" : "text-muted")}>
                              Variation {row.variancePercent > 0 ? "+" : ""}{row.variancePercent.toFixed(0)}%
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", paymentStatusTone(row.paymentStatus))}>
                            {paymentStatusLabel(row.paymentStatus)}
                          </span>
                          <div className="mt-2 flex items-start gap-2">
                            <CalendarClock
                              size={14}
                              className={cn("mt-0.5 shrink-0", deadlineToneClass[paymentDeadline.severity as keyof typeof deadlineToneClass])}
                              aria-hidden="true"
                            />
                            <div>
                              <div className={cn("text-sm font-bold", deadlineToneClass[paymentDeadline.severity as keyof typeof deadlineToneClass])}>
                                {paymentDeadline.label}
                              </div>
                              <div className="text-xs text-muted">{formatDate(row.paymentDeadline)}</div>
                            </div>
                          </div>
                          {row.remainingAmount > 0 ? (
                            <div className="mt-1 text-xs font-semibold text-muted">
                              Reste {formatMad(row.remainingAmount)}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <AdvisoryConfidenceBadge level={row.confidence} />
                          <div className="filing-docs-summary mt-2">
                            {row.missingRequired > 0 ? (
                              <span className="filing-docs-pill filing-docs-pill-warn">{row.missingRequired} manquant(s)</span>
                            ) : null}
                            {row.unreviewedDocuments > 0 ? (
                              <span className="filing-docs-pill filing-docs-pill-warn">{row.unreviewedDocuments} à revoir</span>
                            ) : null}
                            {!row.missingRequired && !row.unreviewedDocuments ? (
                              <span className="text-xs font-semibold text-emerald-700">Données complètes</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <AdvisoryRiskBadge level={row.riskLevel} />
                          <div className="doc-dossier-context mt-2">
                            {row.auditCases
                              ? `${row.auditCases} contrôle(s) fiscal(aux)`
                              : row.missingDeductibleSignals.length
                                ? "TVA déductible à récupérer"
                                : "—"}
                          </div>
                        </td>
                        <td className="doc-actions-cell">
                          <Link href={`/app/tva-filing/${row.filingCaseId}`} className="btn btn-compact">
                            Ouvrir
                            <ChevronRight size={15} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls total={filteredRows.length} page={page} limit={limit} searchParams={params} />
        </div>

        <aside className="grid gap-4 self-start">
          <div className="card p-4">
            <h2 className="font-extrabold">Alertes rapides</h2>
            <div className="mt-3 grid gap-2">
              <div className="exposure-alert-card border-red-200 bg-red-50">
                <div className="exposure-alert-value text-red-800">{portfolio.summary.criticalCount}</div>
                <div className="text-sm text-red-900">Client(s) en risque critique</div>
              </div>
              <div className="exposure-alert-card border-amber-200 bg-amber-50">
                <div className="exposure-alert-value text-amber-800">{portfolio.summary.lowConfidenceCount}</div>
                <div className="text-sm text-amber-900">Estimation(s) à confiance faible</div>
              </div>
              <div className="exposure-alert-card border-slate-200 bg-slate-50">
                <div className="exposure-alert-value text-slate-800">{portfolio.summary.missingDataCount}</div>
                <div className="text-sm text-slate-700">Dossier(s) avec données manquantes</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2">
              <FileSearch size={17} aria-hidden="true" />
              <h2 className="font-extrabold">Recommandations</h2>
            </div>
            <div className="mt-3 grid gap-3">
              {portfolio.recommendations.map((item) => (
                <Link key={item.id} href={item.href} className="exposure-recommendation-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold", advisorySeverityTone[item.severity])}>
                      {advisorySeverityLabel[item.severity] || item.severity}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      {advisoryCategoryLabel[item.category] || item.category}
                    </span>
                  </div>
                  <div className="mt-2 font-extrabold leading-snug">{item.title}</div>
                  <div className="mt-1 text-sm text-muted">{item.description}</div>
                  <div className="mt-2 flex items-center gap-1 text-sm font-bold text-primary">
                    {item.recommendedAction}
                    <ChevronRight size={14} aria-hidden="true" />
                  </div>
                </Link>
              ))}
              {!portfolio.recommendations.length ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
                  Aucun signal advisory urgent pour le moment.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
