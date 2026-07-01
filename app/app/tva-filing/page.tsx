import { AlertTriangle, CalendarClock, FileCheck2, LockKeyhole, Plus, UnlockKeyhole } from "lucide-react";
import Link from "next/link";
import { Prisma, TvaFilingStatus } from "@prisma/client";
import { createTvaFilingCaseAction } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { FilingStatusBadge } from "@/components/FilingStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { deadlineWarning, filingStatusLabel } from "@/lib/tva-filing";
import { cn, formatDate } from "@/lib/utils";

const deadlineToneClass = {
  CRITICAL: "deadline-critical",
  HIGH: "deadline-high",
  MEDIUM: "deadline-medium",
  LOW: "deadline-low"
} as const;

export default async function TvaFilingPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const status = Object.values(TvaFilingStatus).includes(params.status as TvaFilingStatus) ? (params.status as TvaFilingStatus) : undefined;
  const statusClientCollectionIds = status
    ? (await prisma.tvaFilingCase.findMany({
        where: { firmId: user.firmId, status },
        select: { clientCollectionId: true }
      })).map((item) => item.clientCollectionId)
    : undefined;
  const clientCollectionWhere: Prisma.ClientCollectionWhereInput = {
    firmId: user.firmId,
    id: statusClientCollectionIds ? { in: statusClientCollectionIds } : undefined,
    collectionPeriod: { workflowType: { in: ["TVA_MONTHLY", "TVA_QUARTERLY"] } },
    OR: search ? [
      { client: { companyName: { contains: search, mode: "insensitive" } } },
      { client: { phone: { contains: search, mode: "insensitive" } } },
      { client: { email: { contains: search, mode: "insensitive" } } },
      { collectionPeriod: { name: { contains: search, mode: "insensitive" } } }
    ] : undefined
  };

  const [filingCases, clientCollections, total] = await Promise.all([
    prisma.tvaFilingCase.findMany({ where: { firmId: user.firmId }, orderBy: { declarationDeadline: "asc" } }),
    prisma.clientCollection.findMany({
      where: clientCollectionWhere,
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        uploadedDocuments: true
      },
      orderBy: [{ collectionPeriod: { year: "desc" } }, { collectionPeriod: { month: "desc" } }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.clientCollection.count({ where: clientCollectionWhere })
  ]);

  const casesByClientCollection = new Map(filingCases.map((item) => [item.clientCollectionId, item]));
  const readyToFile = filingCases.filter((item) => item.status === "READY_TO_FILE" || item.status === "DRAFT").length;
  const paymentPending = filingCases.filter((item) => item.status === "PAYMENT_PENDING").length;
  const paid = filingCases.filter((item) => item.status === "PAID" || item.status === "ARCHIVED").length;
  const hasActiveFilters = Boolean(search || status);

  return (
    <div className="content-stack">
      <PageHeader
        title="Déclaration TVA"
        description="Suivez chaque dossier de déclaration — de la préparation au paiement et à l'archivage des preuves."
        actions={
          <Link href="/app/tva-readiness" className="btn btn-primary">
            Préparation TVA
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label">À préparer / déclarer</div>
          <div className="stat-card-value text-blue-700">{readyToFile}</div>
          <div className="stat-card-note">Brouillons et dossiers prêts à déposer</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Paiements en attente</div>
          <div className="stat-card-value text-amber-700">{paymentPending}</div>
          <div className="stat-card-note">Déclarations soumises, paiement à confirmer</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Payés / archivés</div>
          <div className="stat-card-value text-emerald-700">{paid}</div>
          <div className="stat-card-note">Dossiers clos avec preuve fiscale</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Périodes TVA clients</h2>
          <p className="mt-1 text-sm text-muted">
            {hasActiveFilters
              ? `${total} période(s) correspondant aux filtres actifs.`
              : "Créez un dossier de déclaration quand la période est prête à être suivie jusqu'au paiement."}
          </p>
        </div>

        <SearchFilterForm
          searchPlaceholder="Rechercher client, téléphone, période"
          filters={[{
            name: "status",
            label: "Déclaration",
            value: params.status,
            options: [
              { value: "", label: "Tous les statuts" },
              ...Object.values(TvaFilingStatus).map((item) => ({
                value: item,
                label: filingStatusLabel(item)
              }))
            ]
          }]}
        />

        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />

        {!clientCollections.length ? (
          <div className="p-4">
            <EmptyState
              icon={FileCheck2}
              title={hasActiveFilters ? "Aucune période trouvée" : "Aucune période TVA prête"}
              description={
                hasActiveFilters
                  ? "Essayez d'élargir les filtres ou de réinitialiser la recherche."
                  : "Créez d'abord une collecte TVA et ajoutez des clients. Les dossiers de déclaration pourront ensuite être créés ici."
              }
              actionHref={hasActiveFilters ? "/app/tva-filing" : "/app/collections"}
              actionLabel={hasActiveFilters ? "Effacer les filtres" : "Créer une collecte"}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Documents</th>
                  <th>Déclaration</th>
                  <th>Échéance</th>
                  <th>Verrou</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientCollections.map((item) => {
                  const filingCase = casesByClientCollection.get(item.id);
                  const deadline = filingCase ? deadlineWarning(filingCase.declarationDeadline) : null;
                  const missing = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING").length;
                  const unreviewed = item.uploadedDocuments.filter((document) => document.qualityStatus === "UNREVIEWED").length;
                  const invalid = item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;

                  return (
                    <tr key={item.id}>
                      <td className="doc-dossier-cell">
                        <Link href={`/app/clients/${item.clientId}`} className="doc-dossier-link">
                          {item.client.companyName}
                        </Link>
                        <div className="doc-dossier-context">{item.client.phone || item.client.email || "—"}</div>
                      </td>
                      <td>
                        <div className="font-bold">{item.collectionPeriod.name}</div>
                        <div className="doc-dossier-context">
                          {workflowTemplateFromType(item.collectionPeriod.workflowType).label} · {monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}
                        </div>
                      </td>
                      <td>
                        <div className="filing-docs-summary">
                          <div className="font-bold">{item.uploadedDocuments.length} reçu(s)</div>
                          {missing > 0 ? (
                            <span className="filing-docs-pill filing-docs-pill-danger">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {missing} manquant(s)
                            </span>
                          ) : null}
                          {unreviewed > 0 ? (
                            <span className="filing-docs-pill filing-docs-pill-warn">
                              {unreviewed} à vérifier
                            </span>
                          ) : null}
                          {invalid > 0 ? (
                            <span className="filing-docs-pill filing-docs-pill-danger">
                              {invalid} invalide(s)
                            </span>
                          ) : null}
                          {!missing && !unreviewed && !invalid ? (
                            <span className="text-xs font-semibold text-emerald-700">Dossier documentaire OK</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {filingCase ? (
                          <FilingStatusBadge status={filingCase.status} />
                        ) : (
                          <span className="text-sm font-semibold text-muted">Aucun dossier</span>
                        )}
                      </td>
                      <td>
                        {filingCase && deadline ? (
                          <div className="flex items-start gap-2">
                            <CalendarClock size={15} className={cn("mt-0.5 shrink-0", deadlineToneClass[deadline.severity as keyof typeof deadlineToneClass])} aria-hidden="true" />
                            <div>
                              <div className={deadlineToneClass[deadline.severity as keyof typeof deadlineToneClass]}>
                                {deadline.label}
                              </div>
                              <div className="text-xs text-muted">{formatDate(filingCase.declarationDeadline)}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.isLocked ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-800">
                            <LockKeyhole size={14} aria-hidden="true" />
                            Verrouillée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
                            <UnlockKeyhole size={14} aria-hidden="true" />
                            Ouverte
                          </span>
                        )}
                      </td>
                      <td className="doc-actions-cell">
                        {filingCase ? (
                          <Link className="btn btn-compact" href={`/app/tva-filing/${filingCase.id}`}>
                            <FileCheck2 size={16} aria-hidden="true" />
                            Ouvrir
                          </Link>
                        ) : (
                          <form action={createTvaFilingCaseAction.bind(null, item.id)}>
                            <PendingSubmitButton className="btn btn-compact btn-primary">
                              <Plus size={16} aria-hidden="true" />
                              Créer
                            </PendingSubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
