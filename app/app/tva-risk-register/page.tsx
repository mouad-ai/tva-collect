import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { monthNames } from "@/lib/constants";
import { fiscalSeverityLabel } from "@/lib/fiscal-audit";
import { prisma } from "@/lib/prisma";
import { calculateTvaReadiness, readinessStatusLabel } from "@/lib/tva-readiness";
import { cn } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-800"
};

export default async function TvaRiskRegisterPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; severity?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim().toLowerCase();
  const clientCollections = await prisma.clientCollection.findMany({
    where: {
      firmId: user.firmId,
      collectionPeriod: { workflowType: { in: ["TVA_MONTHLY", "TVA_QUARTERLY"] } }
    },
    include: {
      client: true,
      collectionPeriod: true,
      requiredDocuments: true,
      uploadedDocuments: true,
      tvaAmountEntries: true
    },
    orderBy: [{ collectionPeriod: { year: "desc" } }, { collectionPeriod: { month: "desc" } }, { client: { companyName: "asc" } }],
    take: 300
  });

  const allRisks = clientCollections.flatMap((item) => {
    const readiness = calculateTvaReadiness(item);
    const period = `${monthNames[item.collectionPeriod.month - 1]} ${item.collectionPeriod.year}`;
    const blocking = readiness.blockingIssues.map((issue) => ({
      key: `${item.id}-blocking-${issue}`,
      severity: "CRITICAL" as const,
      clientName: item.client.companyName,
      period,
      title: issue,
      source: "Blocage readiness",
      href: `/app/tva-readiness/${item.id}`
    }));
    const warnings = readiness.warningIssues.map((issue) => ({
      key: `${item.id}-warning-${issue}`,
      severity: readiness.riskLevel,
      clientName: item.client.companyName,
      period,
      title: issue,
      source: readinessStatusLabel(readiness.status),
      href: `/app/tva-readiness/${item.id}`
    }));
    return [...blocking, ...warnings];
  });
  const risks = allRisks.filter((risk) => {
    const matchesSeverity = params.severity ? risk.severity === params.severity : true;
    const matchesSearch = search
      ? `${risk.clientName} ${risk.period} ${risk.title} ${risk.source}`.toLowerCase().includes(search)
      : true;
    return matchesSeverity && matchesSearch;
  });
  const paginatedRisks = risks.slice((page - 1) * limit, page * limit);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Registre des risques TVA</h1>
        <p className="text-sm text-muted">Registre calcule depuis les readiness checks, documents manquants, documents invalides et saisies TVA suspectes.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><AlertTriangle size={16} /> Risques ouverts</div>
          <div className="mt-2 text-3xl font-black">{allRisks.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Critiques</div>
          <div className="mt-2 text-3xl font-black">{risks.filter((risk) => risk.severity === "CRITICAL").length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><CheckCircle2 size={16} /> Dossiers suivis</div>
          <div className="mt-2 text-3xl font-black">{clientCollections.length}</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <SearchFilterForm
          searchPlaceholder="Rechercher client, période, risque"
          filters={[{ name: "severity", label: "Severite", value: params.severity, options: [
            { value: "", label: "Toutes les severites" },
            { value: "CRITICAL", label: "Critique" },
            { value: "HIGH", label: "Élevé" },
            { value: "MEDIUM", label: "Moyen" },
            { value: "LOW", label: "Faible" }
          ] }]}
        />
        <PaginationControls total={risks.length} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Période</th>
                <th>Severite</th>
                <th>Source</th>
                <th>Risque</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRisks.map((risk) => (
                <tr key={risk.key}>
                  <td className="font-bold">{risk.clientName}</td>
                  <td>{risk.period}</td>
                  <td>
                    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", riskTone[risk.severity])}>
                      {fiscalSeverityLabel(risk.severity)}
                    </span>
                  </td>
                  <td>{risk.source}</td>
                  <td>{risk.title}</td>
                  <td><Link href={risk.href} className="btn">Ouvrir</Link></td>
                </tr>
              ))}
              {!paginatedRisks.length ? (
                <tr><td colSpan={6}><EmptyState title="Aucun risque TVA" description="Aucun risque ne correspond aux filtres." /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={risks.length} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

