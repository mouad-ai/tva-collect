import { Check, CheckCircle2, Download, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { DocumentQualityStatus, Prisma } from "@prisma/client";
import { classifyUploadedDocumentAction, updateUploadedDocumentQualityAction } from "@/app/actions";
import { DocumentQualityBadge } from "@/components/DocumentQualityBadge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

const qualityFilterOptions = [
  { value: "", label: "Tous les contrôles" },
  { value: "UNREVIEWED", label: "À vérifier" },
  { value: "VALID", label: "Valide" },
  { value: "WRONG_DOCUMENT", label: "Mauvais document" },
  { value: "UNREADABLE", label: "Illisible" },
  { value: "DUPLICATE", label: "Doublon" },
  { value: "MISSING_PAGE", label: "Page manquante" },
  { value: "NOT_TVA", label: "Hors TVA" }
];

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; collectionPeriodId?: string; search?: string; qualityStatus?: string; page?: string; limit?: string; sort?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const qualityStatus = params.qualityStatus && Object.values(DocumentQualityStatus).includes(params.qualityStatus as DocumentQualityStatus)
    ? (params.qualityStatus as DocumentQualityStatus)
    : undefined;

  const scopeWhere: Prisma.UploadedDocumentWhereInput = {
    firmId: user.firmId,
    deletedAt: null,
    originalFileName: params.search ? { contains: params.search, mode: "insensitive" as const } : undefined,
    clientCollection: {
      deletedAt: null,
      clientId: params.clientId || undefined,
      collectionPeriodId: params.collectionPeriodId || undefined,
      client: { deletedAt: null },
      collectionPeriod: { deletedAt: null }
    }
  };

  const where: Prisma.UploadedDocumentWhereInput = {
    ...scopeWhere,
    qualityStatus
  };

  const [clients, collections, documents, total, unreviewedCount, validCount, invalidCount] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId, deletedAt: null }, orderBy: { companyName: "asc" } }),
    prisma.collectionPeriod.findMany({ where: { firmId: user.firmId, deletedAt: null }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.uploadedDocument.findMany({
      where,
      include: {
        requiredDocument: true,
        clientCollection: { include: { client: true, collectionPeriod: true, requiredDocuments: { orderBy: { createdAt: "asc" } } } }
      },
      orderBy: params.sort === "name" ? { originalFileName: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.uploadedDocument.count({ where }),
    prisma.uploadedDocument.count({ where: { ...scopeWhere, qualityStatus: "UNREVIEWED" } }),
    prisma.uploadedDocument.count({ where: { ...scopeWhere, qualityStatus: "VALID" } }),
    prisma.uploadedDocument.count({
      where: {
        ...scopeWhere,
        qualityStatus: { notIn: ["UNREVIEWED", "VALID"] }
      }
    })
  ]);

  const hasActiveFilters = Boolean(params.search || params.clientId || params.collectionPeriodId || params.qualityStatus);

  return (
    <div className="content-stack">
      <PageHeader
        title="Documents"
        description="Fichiers déposés par vos clients — classez, contrôlez la qualité et téléchargez les pièces."
        actions={
          <Link href="/app/collections" className="btn btn-primary">
            Ouvrir les collectes
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-label">À vérifier</div>
          <div className="stat-card-value text-amber-700">{unreviewedCount}</div>
          <div className="stat-card-note">En attente de contrôle qualité</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Valides</div>
          <div className="stat-card-value text-emerald-700">{validCount}</div>
          <div className="stat-card-note">Prêts pour la préparation TVA</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">À corriger</div>
          <div className="stat-card-value text-red-700">{invalidCount}</div>
          <div className="stat-card-note">Rejetés ou à redemander au client</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Bibliothèque de fichiers</h2>
          <p className="mt-1 text-sm text-muted">
            {hasActiveFilters
              ? `${total} document(s) correspondant aux filtres actifs.`
              : "Parcourez tous les dépôts reçus, filtrez par dossier et mettez à jour le contrôle en ligne."}
          </p>
        </div>

        <SearchFilterForm
          searchPlaceholder="Rechercher un nom de fichier"
          filters={[
            {
              name: "clientId",
              label: "Client",
              value: params.clientId,
              options: [{ value: "", label: "Tous les clients" }, ...clients.map((client) => ({ value: client.id, label: client.companyName }))]
            },
            {
              name: "collectionPeriodId",
              label: "Collecte",
              value: params.collectionPeriodId,
              options: [{ value: "", label: "Toutes les collectes" }, ...collections.map((collection) => ({ value: collection.id, label: collection.name }))]
            },
            {
              name: "qualityStatus",
              label: "Contrôle",
              value: params.qualityStatus,
              options: qualityFilterOptions
            },
            {
              name: "sort",
              label: "Tri",
              value: params.sort,
              options: [{ value: "", label: "Dépôt récent" }, { value: "name", label: "Nom fichier" }]
            }
          ]}
        />

        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />

        {!documents.length ? (
          <div className="p-4">
            <EmptyState
              icon={FileText}
              title={hasActiveFilters ? "Aucun document trouvé" : "Aucun document reçu"}
              description={
                hasActiveFilters
                  ? "Essayez d'élargir les filtres ou de réinitialiser la recherche."
                  : "Envoyez les liens de dépôt à vos clients. Les fichiers reçus apparaîtront ici pour classification et contrôle."
              }
              actionHref={hasActiveFilters ? "/app/documents" : "/app/collections"}
              actionLabel={hasActiveFilters ? "Effacer les filtres" : "Ouvrir les collectes"}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Dossier</th>
                  <th>Classification</th>
                  <th>Contrôle qualité</th>
                  <th>Accusé client</th>
                  <th>Dépôt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => {
                  const collectionHref = `/app/collections/${document.clientCollection.collectionPeriodId}`;
                  const clientHref = `/app/clients/${document.clientCollection.clientId}`;

                  return (
                    <tr key={document.id}>
                      <td>
                        <div className="doc-file-cell">
                          <span className="doc-file-icon" aria-hidden="true">
                            <FileText size={16} />
                          </span>
                          <div>
                            <div className="doc-file-name" title={document.originalFileName}>
                              {document.originalFileName}
                            </div>
                            <div className="doc-file-meta">{formatBytes(document.size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="doc-dossier-cell">
                        <Link href={clientHref} className="doc-dossier-link">
                          {document.clientCollection.client.companyName}
                        </Link>
                        <div className="doc-dossier-context">
                          <Link href={collectionHref}>{document.clientCollection.collectionPeriod.name}</Link>
                        </div>
                      </td>
                      <td>
                        <form action={classifyUploadedDocumentAction.bind(null, document.id)} className="doc-inline-form">
                          <div className="doc-inline-form-row">
                            <select name="requiredDocumentId" defaultValue={document.requiredDocumentId || ""} aria-label="Type de document">
                              <option value="">Autre / non classé</option>
                              {document.clientCollection.requiredDocuments.map((doc) => (
                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                              ))}
                            </select>
                            <PendingSubmitButton className="btn btn-compact btn-primary" pendingLabel="...">
                              <Check size={14} aria-hidden="true" />
                              <span className="sr-only">Enregistrer la classification</span>
                            </PendingSubmitButton>
                          </div>
                          {document.requiredDocument ? (
                            <div className="text-xs font-semibold text-muted">Actuel : {document.requiredDocument.name}</div>
                          ) : null}
                        </form>
                      </td>
                      <td className="doc-review-cell">
                        <form action={updateUploadedDocumentQualityAction.bind(null, document.id)} className="doc-inline-form">
                          <DocumentQualityBadge status={document.qualityStatus} />
                          <div className="doc-inline-form-row">
                            <select name="qualityStatus" defaultValue={document.qualityStatus} aria-label="Statut de contrôle">
                              <option value="UNREVIEWED">À vérifier</option>
                              <option value="VALID">Valide</option>
                              <option value="WRONG_DOCUMENT">Mauvais document</option>
                              <option value="UNREADABLE">Illisible</option>
                              <option value="DUPLICATE">Doublon</option>
                              <option value="MISSING_PAGE">Page manquante</option>
                              <option value="NOT_TVA">Hors TVA</option>
                            </select>
                            <PendingSubmitButton className="btn btn-compact btn-primary" pendingLabel="...">
                              <Check size={14} aria-hidden="true" />
                              <span className="sr-only">Enregistrer le contrôle</span>
                            </PendingSubmitButton>
                          </div>
                          <input
                            name="accountantComment"
                            defaultValue={document.accountantComment || ""}
                            placeholder="Commentaire interne (optionnel)"
                          />
                        </form>
                      </td>
                      <td>
                        {document.clientAcknowledgedDelayRisk ? (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                            <div>
                              <div className="text-sm font-bold text-emerald-700">Confirmé</div>
                              <div className="text-xs text-muted">{formatDate(document.clientAcknowledgedAt)}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <ShieldAlert size={15} aria-hidden="true" />
                            Non confirmé
                          </div>
                        )}
                      </td>
                      <td className="num">{formatDate(document.createdAt)}</td>
                      <td className="doc-actions-cell">
                        <a className="btn btn-compact" href={`/api/documents/${document.id}/download`} title="Télécharger">
                          <Download size={16} aria-hidden="true" />
                          <span className="sr-only">Télécharger {document.originalFileName}</span>
                        </a>
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
