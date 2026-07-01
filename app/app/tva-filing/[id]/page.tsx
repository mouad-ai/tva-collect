import { ArrowLeft, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { TvaPaymentMethod, TvaPaymentStatus, TvaSubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { lockClientCollectionAction, unlockClientCollectionAction, updateTvaPaymentAction, updateTvaSubmissionAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { deadlineWarning, filingStatusLabel, filingStatusTone, paymentStatusLabel, submissionStatusLabel } from "@/lib/tva-filing";
import { cn, formatDate } from "@/lib/utils";

function dateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function moneyValue(value: unknown) {
  return value == null ? "" : String(value);
}

export default async function TvaFilingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const filingCase = await prisma.tvaFilingCase.findFirst({ where: { id, firmId: user.firmId } });
  if (!filingCase) return <div className="card p-6">Dossier de declaration introuvable.</div>;
  const [clientCollection, submissions, payment, receipts] = await Promise.all([
    prisma.clientCollection.findFirst({
      where: { id: filingCase.clientCollectionId, firmId: user.firmId },
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        uploadedDocuments: { orderBy: { createdAt: "desc" } }
      }
    }),
    prisma.tvaSubmission.findMany({ where: { filingCaseId: filingCase.id, firmId: user.firmId }, orderBy: { createdAt: "desc" } }),
    prisma.tvaPayment.findUnique({ where: { filingCaseId: filingCase.id } }),
    prisma.fiscalReceipt.findMany({ where: { filingCaseId: filingCase.id, firmId: user.firmId }, orderBy: { createdAt: "desc" } })
  ]);
  if (!clientCollection) return <div className="card p-6">Période client introuvable.</div>;

  const declarationDeadline = deadlineWarning(filingCase.declarationDeadline);
  const paymentDeadline = deadlineWarning(filingCase.paymentDeadline);
  const missing = clientCollection.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
  const unreviewed = clientCollection.uploadedDocuments.filter((document) => document.qualityStatus === "UNREVIEWED");
  const rejected = clientCollection.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus));

  return (
    <div className="content-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
            <Link href="/app/tva-filing" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Declarations TVA</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{clientCollection.client.companyName}</h1>
          <p className="text-sm text-muted">
            {workflowTemplateFromType(clientCollection.collectionPeriod.workflowType).label} - {monthNames[filingCase.periodMonth - 1]} {filingCase.periodYear}
          </p>
        </div>
        <span className={cn("inline-flex rounded-full border px-3 py-2 text-sm font-black", filingStatusTone(filingCase.status))}>
          {filingStatusLabel(filingCase.status)}
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Declaration</div>
          <div className="mt-2 font-black">{declarationDeadline.label}</div>
          <div className="text-xs text-muted">{formatDate(filingCase.declarationDeadline)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Paiement</div>
          <div className="mt-2 font-black">{paymentDeadline.label}</div>
          <div className="text-xs text-muted">{formatDate(filingCase.paymentDeadline)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Documents</div>
          <div className="mt-2 font-black">{clientCollection.uploadedDocuments.length} reçu(s)</div>
          <div className="text-xs text-muted">{missing.length} manquant(s), {unreviewed.length} a verifier</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Verrou période</div>
          <div className="mt-2 font-black">{clientCollection.isLocked ? "Verrouillee" : "Ouverte"}</div>
          <div className="text-xs text-muted">{clientCollection.lockReason || "Dépôt client autorise tant que la collecte est active."}</div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
              <h2 className="font-extrabold">Contrôle avant declaration</h2>
            <p className="text-sm text-muted">Ce bloc ne remplace pas la declaration externe. Il garde la preuve de ce qui a été suivi dans TVA Collect.</p>
          </div>
          {clientCollection.isLocked ? (
            <form action={unlockClientCollectionAction.bind(null, clientCollection.id)} className="flex flex-wrap gap-2">
              <input name="unlockReason" placeholder="Raison de reouverture" required />
              <button className="btn"><UnlockKeyhole size={16} /> Rouvrir</button>
            </form>
          ) : (
            <form action={lockClientCollectionAction.bind(null, clientCollection.id)} className="flex flex-wrap gap-2">
              <input name="lockReason" placeholder="Raison du verrouillage" defaultValue="Preparation declaration TVA demarree." />
              <button className="btn btn-primary"><LockKeyhole size={16} /> Verrouiller</button>
            </form>
          )}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="font-extrabold">Manquants</div>
            <div className="mt-1 text-muted">{missing.length ? missing.map((doc) => doc.name).join(", ") : "Aucun document obligatoire manquant."}</div>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="font-extrabold">À vérifier</div>
            <div className="mt-1 text-muted">{unreviewed.length} document(s) non revu(s).</div>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="font-extrabold">Rejetes / invalides</div>
            <div className="mt-1 text-muted">{rejected.length} document(s) avec probleme ouvert.</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-black">Soumission externe</h2>
          <form action={updateTvaSubmissionAction.bind(null, filingCase.id)} className="grid gap-3">
            <label>Statut<select name="status" defaultValue={submissions[0]?.status || TvaSubmissionStatus.NOT_SUBMITTED}>
              {Object.values(TvaSubmissionStatus).map((status) => <option key={status} value={status}>{submissionStatusLabel(status)}</option>)}
            </select></label>
            <label>Reference externe<input name="externalReference" defaultValue={submissions[0]?.externalReference || ""} /></label>
            <label>Date de soumission<input name="submittedAt" type="date" defaultValue={dateInputValue(submissions[0]?.submittedAt)} /></label>
            <label>Raison rejet / correction<textarea name="rejectionReason" rows={2} defaultValue={submissions[0]?.rejectionReason || ""} /></label>
            <label>Notes<textarea name="notes" rows={3} defaultValue={submissions[0]?.notes || ""} /></label>
            <button className="btn btn-primary w-fit">Sauver submission</button>
          </form>
          <div className="mt-4 grid gap-2 text-sm">
            {submissions.map((submission) => (
              <div key={submission.id} className="rounded-md border border-border p-3">
                <div className="font-bold">{submissionStatusLabel(submission.status)} - {formatDate(submission.createdAt)}</div>
                <div className="text-muted">{submission.externalReference || submission.notes || "-"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-black">Paiement TVA</h2>
          <form action={updateTvaPaymentAction.bind(null, filingCase.id)} className="grid gap-3">
            <label>Statut<select name="status" defaultValue={payment?.status || TvaPaymentStatus.PENDING}>
              {Object.values(TvaPaymentStatus).map((status) => <option key={status} value={status}>{paymentStatusLabel(status)}</option>)}
            </select></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label>Montant du<input name="amountDue" type="number" step="0.01" defaultValue={moneyValue(payment?.amountDue)} /></label>
              <label>Montant paye<input name="amountPaid" type="number" step="0.01" defaultValue={moneyValue(payment?.amountPaid)} /></label>
            </div>
            <label>Date paiement<input name="paymentDate" type="date" defaultValue={dateInputValue(payment?.paymentDate)} /></label>
            <label>Methode<select name="paymentMethod" defaultValue={payment?.paymentMethod || TvaPaymentMethod.ONLINE_PORTAL}>
              {Object.values(TvaPaymentMethod).map((method) => <option key={method} value={method}>{method}</option>)}
            </select></label>
            <label>Reference paiement<input name="paymentReference" defaultValue={payment?.paymentReference || ""} /></label>
            <label>Notes<textarea name="notes" rows={3} defaultValue={payment?.notes || ""} /></label>
            <button className="btn btn-primary w-fit">Sauver paiement</button>
          </form>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-extrabold">Fiscal Receipt Vault</h2>
        <p className="mt-2 text-sm text-muted">Zone de preuve fiscale pour references externes, reçus de declaration et reçus de paiement. L&apos;upload de reçus sera ajoute a l&apos;etape suivante.</p>
        <div className="mt-4 grid gap-2">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="rounded-md border border-border p-3 text-sm">
              <div className="font-bold">{receipt.type} - {formatDate(receipt.createdAt)}</div>
              <div className="text-muted">{receipt.referenceNumber || receipt.notes || "-"}</div>
            </div>
          ))}
          {!receipts.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Aucun reçu fiscal enregistre pour cette declaration.</div> : null}
        </div>
      </section>
    </div>
  );
}
