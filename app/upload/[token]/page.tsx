import { OperationalActorType } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Circle, Clock, FileText, ShieldCheck, XCircle } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";
import { clientEducationMessages, monthNames, supportEmail, workflowTemplateFromType } from "@/lib/constants";
import {
  clientDocStatus,
  clientDocStatusLabel,
  clientDocStatusTone,
  clientFileStatus,
  type ClientDocStatus
} from "@/lib/document-status";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { deadlineCountdownLabel, daysUntilWorkflowDeadline, workflowDeadline } from "@/lib/tva";
import { cn, formatDate } from "@/lib/utils";

function DocStatusBadge({ status }: { status: ClientDocStatus }) {
  return (
    <span className={cn("badge shrink-0", clientDocStatusTone(status))}>
      <span className="badge-dot" aria-hidden="true" />
      {clientDocStatusLabel(status)}
    </span>
  );
}

function statusIcon(status: ClientDocStatus) {
  if (status === "VALIDATED") return <CheckCircle2 size={20} className="text-emerald-600" />;
  if (status === "REJECTED") return <XCircle size={20} className="text-red-600" />;
  if (status === "PENDING") return <Clock size={20} className="text-blue-600" />;
  return <Circle size={20} className="text-slate-300" />;
}

export default async function PublicUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: {
      firm: true,
      client: true,
      collectionPeriod: true,
      requiredDocuments: { orderBy: { createdAt: "asc" } },
      uploadedDocuments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!item) notFound();
  const headerStore = await headers();
  await recordOperationalEvent({
    firmId: item.firmId,
    actorType: OperationalActorType.CLIENT,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "CLIENT_OPENED_LINK",
    eventTitle: "Lien de dépôt ouvert",
    eventDescription: `${item.client.companyName} a ouvert le lien de dépôt.`,
    metadata: { collectionStatus: item.collectionPeriod.status },
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent"),
    source: "PUBLIC_UPLOAD_PAGE"
  });
  // Group uploaded files by the required document they were classified against so
  // each obligation reflects the cabinet's REAL validation state, not just presence.
  const uploadsByRequiredId = new Map<string, typeof item.uploadedDocuments>();
  for (const upload of item.uploadedDocuments) {
    if (!upload.requiredDocumentId) continue;
    const list = uploadsByRequiredId.get(upload.requiredDocumentId) ?? [];
    list.push(upload);
    uploadsByRequiredId.set(upload.requiredDocumentId, list);
  }

  const docStates = item.requiredDocuments.map((doc) => ({
    doc,
    ...clientDocStatus(doc.status, uploadsByRequiredId.get(doc.id) ?? [])
  }));
  const requiredStates = docStates.filter((entry) => entry.doc.isRequired);
  const submittedCount = requiredStates.filter((entry) => entry.status === "VALIDATED" || entry.status === "PENDING").length;
  const firstRejected = requiredStates.find((entry) => entry.status === "REJECTED");
  const firstMissing = requiredStates.find((entry) => entry.status === "MISSING");
  const progress = requiredStates.length ? Math.round((submittedCount / requiredStates.length) * 100) : 100;
  const workflowTemplate = workflowTemplateFromType(item.collectionPeriod.workflowType);
  const deadline = workflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const daysRemaining = daysUntilWorkflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const nextAction = firstRejected
    ? `Remplacer le document rejete : ${firstRejected.doc.name}.`
    : firstMissing
      ? `Deposer le document suivant : ${firstMissing.doc.name}.`
      : "Confirmer que tous les documents disponibles ont été déposes.";

  const unavailableReason =
    item.firm.status === "SUSPENDED" || item.firm.status === "CANCELLED"
      ? "Ce portail est temporairement indisponible. Veuillez contacter votre cabinet."
      : item.collectionPeriod.status !== "ACTIVE"
      ? "Cette collecte n'est pas ouverte aux dépôts pour le moment. Veuillez contacter votre cabinet."
      : item.isLocked
        ? "Cette période TVA est verrouillee apres review. Veuillez contacter votre cabinet avant tout nouveau dépôt."
        : item.uploadTokenDisabledAt
          ? "Ce lien de dépôt a été desactive. Veuillez contacter votre cabinet."
          : item.uploadTokenExpiresAt && item.uploadTokenExpiresAt < new Date()
            ? "Ce lien de dépôt a expire. Veuillez contacter votre cabinet pour recevoir un nouveau lien."
            : null;

  if (unavailableReason) {
    return (
      <main className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto grid max-w-lg gap-6">
          <div className="card p-6 text-center">
            {item.firm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Firm logos can be arbitrary external URLs in the pilot.
              <img src={item.firm.logoUrl} alt={item.firm.name} className="mx-auto mb-4 max-h-14 max-w-48 object-contain" />
            ) : null}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle size={22} />
            </div>
            <div className="mt-3 text-sm font-bold text-primary">Cabinet : {item.firm.name}</div>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight">{item.isLocked ? "Période verrouillee" : "Portail indisponible"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{unavailableReason}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-16">
      <header className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-2xl gap-3 px-4 py-6">
          {item.firm.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Firm logos can be arbitrary external URLs in the pilot.
            <img src={item.firm.logoUrl} alt={item.firm.name} className="max-h-14 max-w-48 object-contain" />
          ) : (
            <span className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-primary">
              <ShieldCheck size={18} />
              Portail sécurisé
            </span>
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-primary">Cabinet {item.firm.name}</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Déposez vos documents</h1>
          </div>
          <div className="grid gap-1 text-sm text-muted">
            <p><span className="font-bold text-ink">Client :</span> {item.client.companyName}</p>
            <p><span className="font-bold text-ink">Demande :</span> {workflowTemplate.label} — {monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}</p>
            {item.firm.phone || item.firm.email ? (
              <p><span className="font-bold text-ink">Contact cabinet :</span> {[item.firm.phone, item.firm.email].filter(Boolean).join(" · ")}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-2xl gap-5 px-4 pt-6">
        <section className="card border-primary/15 bg-gradient-to-br from-white to-teal-50/40 p-5">
          <h2 className="text-lg font-extrabold">Bienvenue sur votre espace de dépôt</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Déposez ici les pièces demandées par votre cabinet comptable. Aucun compte n&apos;est nécessaire :
            vos fichiers sont transmis uniquement à votre cabinet.
          </p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">1</span>
              Vérifiez les documents demandés
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">2</span>
              Ajoutez des fichiers lisibles
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">3</span>
              Confirmez votre envoi
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Vos documents à fournir</h2>
              <p className="mt-1 text-sm text-muted">
                {submittedCount} envoyé(s) sur {requiredStates.length} demandé(s)
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <Clock size={16} />
                {deadlineCountdownLabel(daysRemaining)}
              </div>
              <div className="mt-1 text-xs text-muted">Échéance estimée : {formatDate(deadline)}</div>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-sm font-bold text-ink">{progress}% du dossier complété</div>
          <div className={cn("alert mt-4", firstRejected ? "alert-danger" : "alert-warning")}>
            <AlertTriangle size={18} />
            <div>
              <div className="font-extrabold">Prochaine action</div>
              <div className="font-medium">{nextAction}</div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-extrabold">Détail des documents demandés</h2>
          <div className="grid gap-2">
            {docStates.map(({ doc, status, reason }) => (
              <div
                key={doc.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                  status === "REJECTED" ? "border-red-200 bg-red-50/50" : "border-border"
                )}
              >
                {statusIcon(status)}
                <span className="flex-1 font-bold text-ink">{doc.name}</span>
                <DocStatusBadge status={status} />
                {status === "REJECTED" ? (
                  <p className="w-full text-sm font-medium text-red-700">
                    {reason
                      ? `Motif du rejet : ${reason}. Merci de déposer un nouveau document ci-dessous.`
                      : "Ce document a été rejeté par votre cabinet. Merci de déposer un nouveau document ci-dessous."}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-extrabold">Conseils pour éviter les retards</h2>
          <div className="grid gap-3">
            {clientEducationMessages.map((message) => (
              <div key={message.title} className="rounded-lg border border-border p-3">
                <div className="font-extrabold text-ink">{message.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{message.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card border-primary/20 p-5 shadow-elevated">
          <h2 className="mb-4 text-lg font-extrabold">Ajouter des fichiers</h2>
          <UploadForm token={token} requiredDocuments={item.requiredDocuments} />
          <p className="mt-3 text-xs text-muted">Formats acceptés : PDF, JPG, PNG, Excel, Word. Taille maximum : 10 Mo par fichier.</p>
        </section>

        <section className="card p-5">
          <h2 className="mb-1 text-lg font-extrabold">Fichiers déjà reçus</h2>
          <p className="mb-3 text-sm text-muted">
            Le statut reflète la validation par votre cabinet. Un fichier rejeté doit être remplacé.
          </p>
          <div className="grid gap-2">
            {item.uploadedDocuments.map((document) => {
              const file = clientFileStatus(document.qualityStatus);
              return (
                <div
                  key={document.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                    file.status === "REJECTED" ? "border-red-200 bg-red-50/50" : "border-border"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={16} className="shrink-0 text-muted" />
                    <span className="truncate font-bold text-ink">{document.originalFileName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{formatDate(document.createdAt)}</span>
                    <DocStatusBadge status={file.status} />
                  </div>
                  {file.status === "REJECTED" && document.accountantComment ? (
                    <p className="w-full text-sm font-medium text-red-700">Motif : {document.accountantComment}</p>
                  ) : null}
                </div>
              );
            })}
            {!item.uploadedDocuments.length ? (
              <div className="alert alert-info">
                <CheckCircle2 size={18} />
                Aucun fichier déposé pour le moment.
              </div>
            ) : null}
          </div>
        </section>

        <p className="pb-2 text-center text-xs text-muted">
          Question sur votre dossier : contactez {item.firm.name}. Problème technique avec ce portail :{" "}
          <a href={`mailto:${supportEmail}`} className="font-bold text-primary">{supportEmail}</a>
        </p>
      </div>
    </main>
  );
}
