import { FileWarning, Plus } from "lucide-react";
import { FiscalAuditCaseStatus, FiscalAuditCaseType, FiscalSeverity, Prisma } from "@prisma/client";
import Link from "next/link";
import { createFiscalAuditCaseAction } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { buildFiscalRiskExposure, fiscalAuditTypeLabel, fiscalSeverityLabel, fiscalStatusLabel, fiscalStatusTone, isOverdue, severityTone } from "@/lib/fiscal-audit";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Défense fiscale" };

export default async function FiscalAuditsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; status?: string; severity?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const status = Object.values(FiscalAuditCaseStatus).includes(params.status as FiscalAuditCaseStatus) ? params.status as FiscalAuditCaseStatus : undefined;
  const severity = Object.values(FiscalSeverity).includes(params.severity as FiscalSeverity) ? params.severity as FiscalSeverity : undefined;
  const clients = await prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } });
  const matchingClientIds = search
    ? clients.filter((client) => `${client.companyName} ${client.phone || ""} ${client.email || ""}`.toLowerCase().includes(search.toLowerCase())).map((client) => client.id)
    : undefined;
  const auditWhere: Prisma.FiscalAuditCaseWhereInput = {
    firmId: user.firmId,
    status,
    severity,
    OR: search ? [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { clientId: { in: matchingClientIds?.length ? matchingClientIds : ["__no_client__"] } }
    ] : undefined
  };
  const [auditCases, auditTotal, filingCases, notices, evidenceRequests, responseDrafts] = await Promise.all([
    prisma.fiscalAuditCase.findMany({ where: auditWhere, orderBy: { openedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.fiscalAuditCase.count({ where: auditWhere }),
    prisma.tvaFilingCase.findMany({ where: { firmId: user.firmId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.taxAuthorityNotice.findMany({ where: { firmId: user.firmId, status: { notIn: ["CLOSED", "RESPONDED"] } } }),
    prisma.fiscalEvidenceRequest.findMany({ where: { firmId: user.firmId, status: { notIn: ["ACCEPTED", "SUBMITTED"] } } }),
    prisma.auditResponseDraft.findMany({ where: { firmId: user.firmId, status: { in: ["DRAFT", "REVIEW_REQUIRED"] } } })
  ]);
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const noticesByCase = new Map<string, typeof notices>();
  for (const notice of notices) {
    if (!notice.auditCaseId) continue;
    noticesByCase.set(notice.auditCaseId, [...(noticesByCase.get(notice.auditCaseId) || []), notice]);
  }
  const evidenceByCase = new Map<string, typeof evidenceRequests>();
  for (const request of evidenceRequests) {
    evidenceByCase.set(request.auditCaseId, [...(evidenceByCase.get(request.auditCaseId) || []), request]);
  }
  const responsesByCase = new Map<string, typeof responseDrafts>();
  for (const response of responseDrafts) {
    responsesByCase.set(response.auditCaseId, [...(responsesByCase.get(response.auditCaseId) || []), response]);
  }
  const openCases = auditCases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length;
  const overdue = [...notices, ...evidenceRequests].filter((item) => isOverdue("responseDeadline" in item ? item.responseDeadline : item.dueDate)).length;

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Audits fiscaux</h1>
        <p className="text-sm text-muted">Défense fiscale : contrôles, notices, preuves demandées et réponses.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Cas ouverts</div>
          <div className="mt-2 text-3xl font-black">{openCases}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Échéances dépassées</div>
          <div className="mt-2 text-3xl font-black">{overdue}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Réponses à préparer</div>
          <div className="mt-2 text-3xl font-black">{responseDrafts.length}</div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-extrabold">Nouveau dossier audit / contrôle</h2>
        <form action={createFiscalAuditCaseAction} className="grid gap-4">
          <div className="field-grid">
            <label>Client<select name="clientId" required defaultValue="">
              <option value="" disabled>Choisir client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
            </select></label>
            <label>Type<select name="type" defaultValue={FiscalAuditCaseType.TAX_CONTROL}>
              {Object.values(FiscalAuditCaseType).map((type) => <option key={type} value={type}>{fiscalAuditTypeLabel(type)}</option>)}
            </select></label>
            <label>Sévérité<select name="severity" defaultValue={FiscalSeverity.MEDIUM}>
              {Object.values(FiscalSeverity).map((severity) => <option key={severity} value={severity}>{fiscalSeverityLabel(severity)}</option>)}
            </select></label>
            <label>Déclaration liée<select name="relatedFilingCaseId" defaultValue="">
              <option value="">Aucun</option>
              {filingCases.map((filingCase) => {
                const client = clientsById.get(filingCase.clientId);
                return <option key={filingCase.id} value={filingCase.id}>{client?.companyName || "Client"} - {filingCase.periodMonth}/{filingCase.periodYear}</option>;
              })}
            </select></label>
          </div>
          <label>Titre<input name="title" placeholder="Contrôle TVA Juillet - demande d'information" required /></label>
          <label>Résumé<textarea name="summary" rows={3} placeholder="Ce que demande l'administration ou le client." /></label>
          <button className="btn btn-primary w-fit"><Plus size={16} /> Créer dossier</button>
        </form>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Dossiers de défense fiscale</h2>
        </div>
        <SearchFilterForm
          searchPlaceholder="Rechercher client, titre, résumé"
          filters={[
            { name: "status", label: "Statut", value: params.status, options: [{ value: "", label: "Tous les statuts" }, ...Object.values(FiscalAuditCaseStatus).map((item) => ({ value: item, label: fiscalStatusLabel(item) }))] },
            { name: "severity", label: "Sévérité", value: params.severity, options: [{ value: "", label: "Toutes les sévérités" }, ...Object.values(FiscalSeverity).map((item) => ({ value: item, label: fiscalSeverityLabel(item) }))] }
          ]}
        />
        <PaginationControls total={auditTotal} page={page} limit={limit} searchParams={params} />
        {!auditCases.length ? (
          <div className="p-4">
            <EmptyState
              icon={FileWarning}
              title="Aucun dossier fiscal"
              description="Créez un dossier uniquement lorsqu'un contrôle, une demande client ou une preuve fiscale doit être suivie."
              actionHref="/app/tva-filing"
              actionLabel="Voir déclarations TVA"
            />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cas</th>
                <th>Client</th>
                <th>Statut</th>
                <th>Sévérité</th>
                <th>Risque</th>
                <th>Ouvert</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {auditCases.map((auditCase) => {
                const caseNotices = noticesByCase.get(auditCase.id) || [];
                const caseEvidence = evidenceByCase.get(auditCase.id) || [];
                const caseResponses = responsesByCase.get(auditCase.id) || [];
                const risk = buildFiscalRiskExposure({
                  severity: auditCase.severity,
                  openNotices: caseNotices.length,
                  overdueNotices: caseNotices.filter((item) => isOverdue(item.responseDeadline)).length,
                  openEvidenceRequests: caseEvidence.length,
                  overdueEvidenceRequests: caseEvidence.filter((item) => isOverdue(item.dueDate)).length,
                  draftResponses: caseResponses.length
                });
                const client = clientsById.get(auditCase.clientId);
                return (
                  <tr key={auditCase.id}>
                    <td className="min-w-[220px]">
                      <div className="font-extrabold">{auditCase.title}</div>
                      <div className="text-xs text-muted">{fiscalAuditTypeLabel(auditCase.type)}</div>
                    </td>
                    <td>{client?.companyName || "-"}</td>
                    <td><span className={cn("badge", fiscalStatusTone(auditCase.status))}><span className="badge-dot" aria-hidden="true" />{fiscalStatusLabel(auditCase.status)}</span></td>
                    <td><span className={cn("badge", severityTone(auditCase.severity))}><span className="badge-dot" aria-hidden="true" />{fiscalSeverityLabel(auditCase.severity)}</span></td>
                    <td>
                      <div className="font-bold">{risk.score}/100</div>
                      <div className="text-xs text-muted">{fiscalSeverityLabel(risk.level)}</div>
                    </td>
                    <td>{formatDate(auditCase.openedAt)}</td>
                    <td><Link className="btn" href={`/app/fiscal-audits/${auditCase.id}`}><FileWarning size={16} /> Ouvrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
        <PaginationControls total={auditTotal} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

