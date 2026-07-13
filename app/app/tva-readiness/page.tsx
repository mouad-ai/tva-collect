import { Prisma, TvaPreparationStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, FileSearch, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { fiscalSeverityLabel } from "@/lib/fiscal-audit";
import { prisma } from "@/lib/prisma";
import { calculateTvaReadiness, preparationStatusLabel, readinessStatusLabel, readinessTone } from "@/lib/tva-readiness";
import { cn, formatDate } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-800"
};

function formatMad(amount: number) {
  return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(amount);
}

export default async function TvaReadinessPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; preparation?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const preparation = Object.values(TvaPreparationStatus).includes(params.preparation as TvaPreparationStatus) ? params.preparation as TvaPreparationStatus : undefined;
  const where: Prisma.ClientCollectionWhereInput = {
    firmId: user.firmId,
    tvaPreparationStatus: preparation,
    collectionPeriod: { workflowType: { in: ["TVA_MONTHLY", "TVA_QUARTERLY"] } },
    OR: search ? [
      { client: { companyName: { contains: search, mode: "insensitive" } } },
      { client: { phone: { contains: search, mode: "insensitive" } } },
      { client: { email: { contains: search, mode: "insensitive" } } },
      { collectionPeriod: { name: { contains: search, mode: "insensitive" } } }
    ] : undefined
  };
  const [clientCollections, total] = await Promise.all([
    prisma.clientCollection.findMany({
    where,
    include: {
      client: true,
      collectionPeriod: true,
      requiredDocuments: true,
      uploadedDocuments: true,
      tvaAmountEntries: true,
      tvaReadinessChecks: { orderBy: { generatedAt: "desc" }, take: 1 }
    },
    orderBy: [{ collectionPeriod: { year: "desc" } }, { collectionPeriod: { month: "desc" } }, { client: { companyName: "asc" } }],
    skip: (page - 1) * limit,
    take: limit
  }),
    prisma.clientCollection.count({ where })
  ]);

  const rows = clientCollections.map((item) => ({ item, readiness: calculateTvaReadiness(item), latestCheck: item.tvaReadinessChecks[0] }));
  const ready = rows.filter((row) => row.readiness.status === "READY").length;
  const warnings = rows.filter((row) => row.readiness.status === "READY_WITH_WARNINGS").length;
  const blocked = rows.filter((row) => row.readiness.status === "BLOCKED").length;
  const noEntries = rows.filter((row) => row.readiness.summary.entriesCount === 0).length;

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Préparation TVA</h1>
        <p className="text-sm text-muted">Contrôle avant déclaration : documents, revue, anomalies simples, montants manuels et statut TVA.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><CheckCircle2 size={16} /> Prêt</div>
          <div className="mt-2 text-3xl font-black">{ready}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><AlertTriangle size={16} /> Avec alertes</div>
          <div className="mt-2 text-3xl font-black">{warnings}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><LockKeyhole size={16} /> Bloqués</div>
          <div className="mt-2 text-3xl font-black">{blocked}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><FileSearch size={16} /> Sans saisie TVA</div>
          <div className="mt-2 text-3xl font-black">{noEntries}</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Dossiers TVA clients</h2>
          <p className="text-sm text-muted">Ouvrez un dossier pour saisir les montants HT/TVA/TTC et marquer la préparation TVA.</p>
        </div>
        <SearchFilterForm
          searchPlaceholder="Rechercher client, téléphone, période"
          filters={[{ name: "preparation", label: "Préparation", value: params.preparation, options: [
            { value: "", label: "Tous les statuts" },
            ...Object.values(TvaPreparationStatus).map((status) => ({ value: status, label: preparationStatusLabel(status) }))
          ] }]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Période</th>
                <th>Readiness</th>
                <th>Préparation</th>
                <th>Documents</th>
                <th>TVA nette</th>
                <th>Dernier check</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, readiness, latestCheck }) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/app/clients/${item.clientId}`} className="font-bold">{item.client.companyName}</Link>
                    <div className="text-xs text-muted">{item.client.phone || item.client.email || "-"}</div>
                  </td>
                  <td>
                    <div className="font-bold">{workflowTemplateFromType(item.collectionPeriod.workflowType).label}</div>
                    <div className="text-xs text-muted">{monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}</div>
                  </td>
                  <td>
                    <span className={cn("badge", readinessTone(readiness.status))}>
                      <span className="badge-dot" aria-hidden="true" />
                      {readinessStatusLabel(readiness.status)}
                    </span>
                    <div className={cn("badge mt-1", riskTone[readiness.riskLevel])}>
                      <span className="badge-dot" aria-hidden="true" />
                      Risque {fiscalSeverityLabel(readiness.riskLevel)}
                    </div>
                  </td>
                  <td>{preparationStatusLabel(item.tvaPreparationStatus)}</td>
                  <td>
                    <div className="font-bold">{item.uploadedDocuments.length} reçu(s)</div>
                    <div className="text-xs text-muted">{readiness.missingDocumentsCount} manquant(s), {readiness.unreviewedDocumentsCount} à vérifier</div>
                  </td>
                  <td>
                    <div className="font-extrabold">{formatMad(readiness.summary.netTVA)}</div>
                    <div className="text-xs text-muted">{readiness.summary.entriesCount} entrée(s)</div>
                  </td>
                  <td>{latestCheck ? formatDate(latestCheck.generatedAt) : "-"}</td>
                  <td><Link href={`/app/tva-readiness/${item.id}`} className="btn">Ouvrir</Link></td>
                </tr>
              ))}
              {!rows.length ? (
                <tr><td colSpan={8}><EmptyState title="Aucune période TVA" description="Aucun dossier TVA ne correspond aux filtres." /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

