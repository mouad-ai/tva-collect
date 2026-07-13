import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, Download, FileWarning, MailCheck, TrendingDown, TrendingUp, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireFirmUser } from "@/lib/auth";
import { BillingEnforcementError, BillingSchemaUnavailableError, requirePlanFeature } from "@/lib/billing";
import { buildClientComplianceProfile, complianceTrendLabel, complianceTrendTone, serviceTierLabel } from "@/lib/client-compliance";
import { monthNames } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function progressTone(progress: number) {
  if (progress >= 80) return "border-emerald-200 bg-emerald-50";
  if (progress >= 50) return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
}

export const metadata = { title: "Rapports" };

export default async function ReportsPage() {
  const user = await requireFirmUser();
  try {
    await requirePlanFeature(user.firmId, "ADVANCED_REPORTS");
  } catch (error) {
    if (error instanceof BillingSchemaUnavailableError) {
      // Billing tables/client not ready yet — do not block reports.
    } else if (error instanceof BillingEnforcementError) {
      redirect("/app/billing?upgrade=reports");
    } else {
      throw error;
    }
  }
  const [collections, missingDocuments, reminders, invalidDocuments, clients] = await Promise.all([
    prisma.collectionPeriod.findMany({
      where: { firmId: user.firmId, deletedAt: null },
      include: { clientCollections: { where: { deletedAt: null } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12
    }),
    prisma.requiredDocument.count({
      where: { firmId: user.firmId, isRequired: true, status: "MISSING", clientCollection: { deletedAt: null } }
    }),
    prisma.reminderLog.count({ where: { firmId: user.firmId } }),
    prisma.uploadedDocument.count({
      where: { firmId: user.firmId, deletedAt: null, qualityStatus: { notIn: ["UNREVIEWED", "VALID"] } }
    }),
    prisma.client.findMany({
      where: { firmId: user.firmId, deletedAt: null },
      include: {
        clientCollections: {
          where: { deletedAt: null },
          include: { collectionPeriod: true, requiredDocuments: true, uploadedDocuments: true, reminderLogs: true }
        }
      },
      orderBy: { companyName: "asc" },
      take: 200
    })
  ]);

  const clientBehavior = clients
    .map((client) => ({ client, compliance: buildClientComplianceProfile(client.clientCollections) }))
    .sort((a, b) => a.compliance.score - b.compliance.score);
  const difficultClients = clientBehavior.slice(0, 5);
  const bestClients = [...clientBehavior].sort((a, b) => b.compliance.score - a.compliance.score).slice(0, 5);
  const totalClientCollections = collections.reduce((sum, collection) => sum + collection.clientCollections.length, 0);
  const totalComplete = collections.reduce(
    (sum, collection) => sum + collection.clientCollections.filter((item) => item.status === "COMPLETE").length,
    0
  );
  const overallProgress = totalClientCollections ? Math.round((totalComplete / totalClientCollections) * 100) : 0;

  return (
    <div className="content-stack">
      <PageHeader
        title="Rapports"
        description="Vue d'ensemble des collectes, documents manquants, relances et comportement client."
        actions={
          <Link href="/app/work-queue" className="btn btn-primary">
            File de travail
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <FileWarning size={15} aria-hidden="true" />
            Documents manquants
          </div>
          <div className="stat-card-value text-amber-700">{missingDocuments}</div>
          <div className="stat-card-note">Pièces requises encore absentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <MailCheck size={15} aria-hidden="true" />
            Relances générées
          </div>
          <div className="stat-card-value text-blue-700">{reminders}</div>
          <div className="stat-card-note">Historique des relances envoyées</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label flex items-center gap-2">
            <AlertTriangle size={15} aria-hidden="true" />
            Documents invalides
          </div>
          <div className="stat-card-value text-red-700">{invalidDocuments}</div>
          <div className="stat-card-note">Fichiers rejetés ou à redemander</div>
        </div>
      </section>

      <section className="stat-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="stat-card-label flex items-center gap-2">
              <BarChart3 size={15} aria-hidden="true" />
              Progression globale des collectes
            </div>
            <div className="stat-card-value">{overallProgress}%</div>
            <div className="stat-card-note">
              {totalComplete} dossier(s) complet(s) sur {totalClientCollections} client(s) suivis
            </div>
          </div>
          <Link href="/app/collections" className="btn btn-compact">
            Voir les collectes
          </Link>
        </div>
        <div className="usage-meter mt-4">
          <div
            className={cn(
              "usage-meter-fill",
              overallProgress >= 80 ? "" : overallProgress >= 50 ? "usage-meter-fill-warn" : "usage-meter-fill-danger"
            )}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={17} className="text-red-700" aria-hidden="true" />
              <h2 className="font-extrabold">Clients à risque</h2>
            </div>
            <p className="mt-1 text-sm text-muted">Score bas, relances fréquentes ou documents invalides.</p>
          </div>
          {!difficultClients.length ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="Pas encore assez de données"
                description="Les scores de conformité apparaîtront après quelques collectes client."
                actionHref="/app/clients"
                actionLabel="Voir les clients"
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Score</th>
                    <th>Relances</th>
                    <th>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {difficultClients.map(({ client, compliance }) => (
                    <tr key={client.id}>
                      <td className="doc-dossier-cell">
                        <Link href={`/app/clients/${client.id}`} className="doc-dossier-link">
                          {client.companyName}
                        </Link>
                      </td>
                      <td>
                        <span className={cn("badge", compliance.tone)}>
                          <span className="badge-dot" aria-hidden="true" />
                          {compliance.score}/100 · {compliance.label}
                        </span>
                      </td>
                      <td className="num">{compliance.averageReminders}</td>
                      <td className="text-sm">{serviceTierLabel(compliance.serviceTier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card min-w-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-emerald-700" aria-hidden="true" />
              <h2 className="font-extrabold">Clients les plus fiables</h2>
            </div>
            <p className="mt-1 text-sm text-muted">Peu de relances et fichiers exploitables rapidement.</p>
          </div>
          {!bestClients.length ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="Pas encore assez de données"
                description="Les meilleurs profils client seront identifiés au fil des collectes."
                actionHref="/app/clients"
                actionLabel="Voir les clients"
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Score</th>
                    <th>Tendance</th>
                    <th>Retard moyen</th>
                  </tr>
                </thead>
                <tbody>
                  {bestClients.map(({ client, compliance }) => (
                    <tr key={client.id}>
                      <td className="doc-dossier-cell">
                        <Link href={`/app/clients/${client.id}`} className="doc-dossier-link">
                          {client.companyName}
                        </Link>
                      </td>
                      <td>
                        <span className={cn("badge", compliance.tone)}>
                          <span className="badge-dot" aria-hidden="true" />
                          {compliance.score}/100
                        </span>
                      </td>
                      <td>
                        <span className={cn("badge", complianceTrendTone(compliance.trend))}>
                          <span className="badge-dot" aria-hidden="true" />
                          {complianceTrendLabel(compliance.trend)}
                        </span>
                      </td>
                      <td className="num">{compliance.averageDelayDays ?? 0} j</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Progression des collectes</h2>
          <p className="mt-1 text-sm text-muted">Suivi par période et export CSV des dossiers clients.</p>
        </div>
        {!collections.length ? (
          <div className="p-4">
            <EmptyState
              icon={BarChart3}
              title="Aucune collecte à analyser"
              description="Créez une collecte TVA pour générer les premiers rapports d'avancement."
              actionHref="/app/collections"
              actionLabel="Créer une collecte"
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collecte</th>
                  <th>Période</th>
                  <th>Clients</th>
                  <th>Complets</th>
                  <th>Progression</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => {
                  const complete = collection.clientCollections.filter((item) => item.status === "COMPLETE").length;
                  const progress = collection.clientCollections.length
                    ? Math.round((complete / collection.clientCollections.length) * 100)
                    : 0;

                  return (
                    <tr key={collection.id}>
                      <td className="doc-dossier-cell">
                        <Link href={`/app/collections/${collection.id}`} className="doc-dossier-link">
                          {collection.name}
                        </Link>
                      </td>
                      <td>{monthNames[collection.month - 1]} {collection.year}</td>
                      <td className="num">{collection.clientCollections.length}</td>
                      <td className="num">{complete}</td>
                      <td>
                        <div className="progress-bar">
                          <div className={cn("rounded-md border px-2 py-1 text-xs font-bold", progressTone(progress))}>
                            {progress}%
                          </div>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={collection.status} /></td>
                      <td className="doc-actions-cell">
                        <a className="btn btn-compact" href={`/api/collections/${collection.id}/export.csv`}>
                          <Download size={15} aria-hidden="true" />
                          CSV
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
