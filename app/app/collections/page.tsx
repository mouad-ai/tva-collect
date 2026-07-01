import { Plus } from "lucide-react";
import { CollectionStatus, Prisma, WorkflowType } from "@prisma/client";
import Link from "next/link";
import { createCollectionAction } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { StatusBadge } from "@/components/StatusBadge";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType, workflowTemplates } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { collectionCloseRisk, deadlineCountdownLabel, deadlineRiskLabel, daysUntilWorkflowDeadline, workflowDeadline } from "@/lib/tva";
import { cn, formatDate } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-700"
};

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; workflowType?: string; page?: string; limit?: string; sort?: string }> }) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const status = params.status && Object.values(CollectionStatus).includes(params.status as CollectionStatus) ? (params.status as CollectionStatus) : undefined;
  const workflowType = params.workflowType && Object.values(WorkflowType).includes(params.workflowType as WorkflowType) ? (params.workflowType as WorkflowType) : undefined;
  const where: Prisma.CollectionPeriodWhereInput = {
    firmId: user.firmId,
    deletedAt: null,
    status,
    workflowType,
    name: params.search ? { contains: params.search, mode: "insensitive" as const } : undefined
  };
  const [collections, total, clients] = await Promise.all([
    prisma.collectionPeriod.findMany({
      where,
      include: { clientCollections: { where: { deletedAt: null }, include: { uploadedDocuments: { where: { deletedAt: null } } } } },
      orderBy: params.sort === "name" ? { name: "asc" } : [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.collectionPeriod.count({ where }),
    prisma.client.findMany({ where: { firmId: user.firmId, deletedAt: null }, orderBy: { companyName: "asc" } })
  ]);

  return (
    <div className="content-stack">
      <PageHeader
        title="Collectes TVA"
        description="Créez une période de travail, ajoutez vos clients et envoyez les liens de dépôt."
      />

      <section className="card p-5">
        <h2 className="mb-4 font-extrabold">Nouvelle collecte</h2>
        <form action={createCollectionAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_190px_150px_150px_auto] md:items-end">
            <label>Nom <span className="required-mark">*</span><input name="name" placeholder="TVA Juillet 2026" required /></label>
            <label>
              Type
              <select name="workflowType" defaultValue="TVA_MONTHLY">
                {workflowTemplates.map((template) => (
                  <option key={template.type} value={template.type}>{template.label}</option>
                ))}
              </select>
            </label>
            <label>Mois<select name="month" defaultValue="6">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
            <label>Annee <span className="required-mark">*</span><input name="year" type="number" defaultValue="2026" required /></label>
            <PendingSubmitButton><Plus size={16} /> Creer</PendingSubmitButton>
          </div>
          {clients.length ? (
            <div>
              <div className="mb-2 text-sm font-bold text-muted">Clients a inclure maintenant</div>
              <div className="grid max-h-72 gap-2 overflow-auto rounded-md border border-border p-3 md:grid-cols-2">
                {clients.map((client) => (
                  <label key={client.id} className="flex flex-row items-center gap-2 rounded-md border border-border p-2">
                    <input className="w-4" type="checkbox" name="clientIds" value={client.id} />
                    <span>{client.companyName}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Ajoutez ou importez des clients avant de générer les liens en masse.</p>
          )}
        </form>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Périodes</h2>
        </div>
        {/* UX-FIX: collections table uses URL filters and pagination. */}
        <SearchFilterForm
          searchPlaceholder="Rechercher collecte"
          filters={[
            { name: "status", label: "Statut", value: params.status, options: [{ value: "", label: "Tous" }, { value: "DRAFT", label: "Brouillon" }, { value: "ACTIVE", label: "Active" }, { value: "CLOSED", label: "Fermée" }] },
            { name: "workflowType", label: "Workflow", value: params.workflowType, options: [{ value: "", label: "Tous" }, ...workflowTemplates.map((template) => ({ value: template.type, label: template.label }))] },
            { name: "sort", label: "Tri", value: params.sort, options: [{ value: "", label: "Période récente" }, { value: "name", label: "Nom" }] }
          ]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!collections.length ? (
          <div className="p-4">
            <EmptyState
              icon={Plus}
              title="Aucune collecte TVA"
              description="Créez une collecte mensuelle ou trimestrielle pour générer les liens de dépôt clients."
              actionHref="/app/clients"
              actionLabel="Vérifier les clients"
            />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Période</th>
                <th>Workflow</th>
                <th>Mois</th>
                <th>Clients</th>
                <th>Complets</th>
                <th>À traiter</th>
                <th>Échéance</th>
                <th>Risque</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const complete = collection.clientCollections.filter((item) => item.status === "COMPLETE").length;
                const missing = collection.clientCollections.length - complete;
                const invalidDocuments = collection.clientCollections.reduce((count, item) => {
                  return count + item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;
                }, 0);
                const deadline = workflowDeadline(collection.workflowType, collection.year, collection.month);
                const daysRemaining = daysUntilWorkflowDeadline(collection.workflowType, collection.year, collection.month);
                const risk = collectionCloseRisk({
                  daysRemaining,
                  totalClients: collection.clientCollections.length,
                  incompleteClients: missing,
                  invalidDocuments
                });
                return (
                  <tr key={collection.id}>
                    <td>
                      <Link className="font-semibold hover:text-primary" href={`/app/collections/${collection.id}`}>
                        {collection.name}
                      </Link>
                    </td>
                    <td>{workflowTemplateFromType(collection.workflowType).label}</td>
                    <td className="num">{monthNames[collection.month - 1]} {collection.year}</td>
                    <td className="num">{collection.clientCollections.length}</td>
                    <td className="num">{complete}</td>
                    <td className="num">{missing}</td>
                    <td>
                      <div className="font-medium whitespace-nowrap">{deadlineCountdownLabel(daysRemaining)}</div>
                      <div className="text-xs text-muted">{formatDate(deadline)}</div>
                    </td>
                    <td>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", riskTone[risk])}>
                        {deadlineRiskLabel(risk)}
                      </span>
                    </td>
                    <td><StatusBadge status={collection.status} /></td>
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

