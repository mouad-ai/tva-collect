import { ArrowLeft, FileText, Send } from "lucide-react";
import { AuditResponseStatus, FiscalAuditCaseStatus, FiscalEvidenceRequestStatus, TaxAuthorityNoticeStatus, TaxAuthorityNoticeType } from "@prisma/client";
import Link from "next/link";
import {
  createAuditResponseDraftAction,
  createFiscalEvidenceRequestAction,
  createTaxAuthorityNoticeAction,
  updateFiscalAuditCaseStatusAction
} from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import {
  buildFiscalRiskExposure,
  evidenceStatusLabel,
  fiscalAuditTypeLabel,
  fiscalSeverityLabel,
  fiscalStatusLabel,
  fiscalStatusTone,
  isOverdue,
  noticeTypeLabel,
  noticeStatusLabel,
  responseStatusLabel,
  severityTone
} from "@/lib/fiscal-audit";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

function dateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export const metadata = { title: "Dossier fiscal" };

export default async function FiscalAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const auditCase = await prisma.fiscalAuditCase.findFirst({ where: { id, firmId: user.firmId } });
  if (!auditCase) return <div className="card p-6">Dossier fiscal introuvable.</div>;

  const [client, filingCase, notices, evidenceRequests, responses, events] = await Promise.all([
    prisma.client.findFirst({ where: { id: auditCase.clientId, firmId: user.firmId } }),
    auditCase.relatedFilingCaseId ? prisma.tvaFilingCase.findFirst({ where: { id: auditCase.relatedFilingCaseId, firmId: user.firmId } }) : null,
    prisma.taxAuthorityNotice.findMany({ where: { auditCaseId: auditCase.id, firmId: user.firmId }, orderBy: { receivedAt: "desc" } }),
    prisma.fiscalEvidenceRequest.findMany({ where: { auditCaseId: auditCase.id, firmId: user.firmId }, orderBy: { createdAt: "desc" } }),
    prisma.auditResponseDraft.findMany({ where: { auditCaseId: auditCase.id, firmId: user.firmId }, orderBy: { createdAt: "desc" } }),
    prisma.operationalEvent.findMany({
      where: { firmId: user.firmId, clientId: auditCase.clientId },
      orderBy: { occurredAt: "desc" },
      take: 50
    })
  ]);

  const openNotices = notices.filter((item) => !["CLOSED", "RESPONDED"].includes(item.status));
  const openEvidence = evidenceRequests.filter((item) => !["ACCEPTED", "SUBMITTED"].includes(item.status));
  const draftResponses = responses.filter((item) => ["DRAFT", "REVIEW_REQUIRED"].includes(item.status));
  const risk = buildFiscalRiskExposure({
    severity: auditCase.severity,
    openNotices: openNotices.length,
    overdueNotices: openNotices.filter((item) => isOverdue(item.responseDeadline)).length,
    openEvidenceRequests: openEvidence.length,
    overdueEvidenceRequests: openEvidence.filter((item) => isOverdue(item.dueDate)).length,
    draftResponses: draftResponses.length
  });

  return (
    <div className="content-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/fiscal-audits" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Audits fiscaux</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{auditCase.title}</h1>
          <p className="text-sm text-muted">{client?.companyName || "Client"} - {fiscalAuditTypeLabel(auditCase.type)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("badge", fiscalStatusTone(auditCase.status))}><span className="badge-dot" aria-hidden="true" />{fiscalStatusLabel(auditCase.status)}</span>
          <span className={cn("badge", severityTone(auditCase.severity))}><span className="badge-dot" aria-hidden="true" />{fiscalSeverityLabel(auditCase.severity)}</span>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className={cn("rounded-lg border p-4", severityTone(risk.level))}>
          <div className="text-sm font-bold">Exposition au risque fiscal</div>
          <div className="mt-2 text-4xl font-black">{risk.score}/100</div>
          <div className="mt-1 text-sm font-black">{fiscalSeverityLabel(risk.level)}</div>
          <div className="mt-4 grid gap-2 text-sm">
            {risk.reasons.map((reason) => <div key={reason}>- {reason}</div>)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">Contrôle du dossier</h2>
              <p className="text-sm text-muted">{auditCase.summary || "Aucun résumé ajouté."}</p>
              {filingCase ? <p className="mt-2 text-sm text-muted">Déclaration liée : {filingCase.periodMonth}/{filingCase.periodYear}</p> : null}
            </div>
            <form action={updateFiscalAuditCaseStatusAction.bind(null, auditCase.id)} className="flex flex-wrap gap-2">
              <select name="status" defaultValue={auditCase.status}>
                {Object.values(FiscalAuditCaseStatus).map((status) => <option key={status} value={status}>{fiscalStatusLabel(status)}</option>)}
              </select>
              <button className="btn btn-primary">Mettre à jour</button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-3 font-black">Avis de l&apos;administration fiscale</h2>
          <form action={createTaxAuthorityNoticeAction.bind(null, auditCase.id)} className="grid gap-3">
            <label>Type<select name="type" defaultValue={TaxAuthorityNoticeType.REQUEST_INFO}>
              {Object.values(TaxAuthorityNoticeType).map((type) => <option key={type} value={type}>{noticeTypeLabel(type)}</option>)}
            </select></label>
            <label>Statut<select name="status" defaultValue={TaxAuthorityNoticeStatus.RESPONSE_REQUIRED}>
              {Object.values(TaxAuthorityNoticeStatus).map((status) => <option key={status} value={status}>{noticeStatusLabel(status)}</option>)}
            </select></label>
            <label>Référence<input name="referenceNumber" /></label>
            <label>Reçu le<input name="receivedAt" type="date" defaultValue={dateInputValue(new Date())} /></label>
            <label>Échéance réponse<input name="responseDeadline" type="date" /></label>
            <label>Résumé<textarea name="summary" rows={3} /></label>
            <button className="btn btn-primary w-fit">Ajouter avis</button>
          </form>
          <div className="mt-4 grid gap-2">
            {notices.map((notice) => (
              <div key={notice.id} className={cn("rounded-md border p-3 text-sm", isOverdue(notice.responseDeadline) && notice.status !== "CLOSED" ? "border-red-200 bg-red-50 text-red-900" : "border-border")}>
                <div className="font-extrabold">{noticeTypeLabel(notice.type)} - {noticeStatusLabel(notice.status)}</div>
                <div className="text-muted">{notice.referenceNumber || "-"} - échéance {formatDate(notice.responseDeadline)}</div>
                <div className="mt-1">{notice.summary || "-"}</div>
              </div>
            ))}
            {!notices.length ? <p className="text-sm text-muted">Aucun avis de l&apos;administration fiscale enregistré.</p> : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-black">Demande de preuve</h2>
          <form action={createFiscalEvidenceRequestAction.bind(null, auditCase.id)} className="grid gap-3">
            <label>Titre<input name="title" required /></label>
            <label>Demande par<input name="requestedBy" defaultValue="Administration fiscale" /></label>
            <label>Échéance<input name="dueDate" type="date" /></label>
            <label>Statut<select name="status" defaultValue={FiscalEvidenceRequestStatus.TODO}>
              {Object.values(FiscalEvidenceRequestStatus).map((status) => <option key={status} value={status}>{evidenceStatusLabel(status)}</option>)}
            </select></label>
            <label>Description<textarea name="description" rows={2} /></label>
            <label>Réponse / preuve<textarea name="responseText" rows={3} /></label>
            <button className="btn btn-primary w-fit">Ajouter demande</button>
          </form>
          <div className="mt-4 grid gap-2">
            {evidenceRequests.map((request) => (
              <div key={request.id} className={cn("rounded-md border p-3 text-sm", isOverdue(request.dueDate) && !["ACCEPTED", "SUBMITTED"].includes(request.status) ? "border-red-200 bg-red-50 text-red-900" : "border-border")}>
                <div className="font-extrabold">{request.title}</div>
                <div className="text-muted">{evidenceStatusLabel(request.status)} - échéance {formatDate(request.dueDate)}</div>
                <div className="mt-1">{request.responseText || request.description || "-"}</div>
              </div>
            ))}
            {!evidenceRequests.length ? <p className="text-sm text-muted">Aucune demande de preuve enregistrée.</p> : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-black">Brouillon de réponse fiscale</h2>
          <form action={createAuditResponseDraftAction.bind(null, auditCase.id)} className="grid gap-3">
            <label>Titre<input name="title" placeholder="Réponse à la demande référence..." required /></label>
            <label>Statut<select name="status" defaultValue={AuditResponseStatus.DRAFT}>
              {Object.values(AuditResponseStatus).map((status) => <option key={status} value={status}>{responseStatusLabel(status)}</option>)}
            </select></label>
            <label>Corps de réponse<textarea name="responseBody" rows={8} required defaultValue={`Objet : Réponse contrôle fiscal\n\nClient : ${client?.companyName || ""}\nRéférence : \n\nRésumé de la réponse :\n\nPièces jointes :\n\nPréparé par : ${user.name}\nDate : ${new Date().toLocaleDateString("fr-FR")}`} /></label>
            <button className="btn btn-primary w-fit"><Send size={16} /> Créer brouillon</button>
          </form>
          <div className="mt-4 grid gap-2">
            {responses.map((response) => (
              <div key={response.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-extrabold">{response.title}</div>
                <div className="text-muted">{responseStatusLabel(response.status)} - {formatDate(response.createdAt)}</div>
                <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-sans text-xs text-muted">{response.responseBody}</pre>
              </div>
            ))}
            {!responses.length ? <p className="text-sm text-muted">Aucun brouillon de réponse fiscale créé.</p> : null}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-black">Chronologie des preuves fiscales</h2>
        <div className="grid gap-2">
          {events.map((event) => (
            <div key={event.id} className="flex gap-3 rounded-md border border-border p-3 text-sm">
              <FileText size={16} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <div className="font-extrabold">{event.eventTitle}</div>
                <div className="text-muted">{formatDate(event.occurredAt)} - {event.source}</div>
                <div>{event.eventDescription || event.eventType}</div>
              </div>
            </div>
          ))}
          {!events.length ? <p className="text-sm text-muted">Aucun événement fiscal ou opérationnel trouvé.</p> : null}
        </div>
      </section>
    </div>
  );
}
