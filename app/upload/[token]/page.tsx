import { OperationalActorType } from "@prisma/client";
import { AlertCircle, CheckCircle2, Circle, Clock, FileText } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";
import { StatusBadge } from "@/components/StatusBadge";
import { clientEducationMessages, monthNames, workflowTemplateFromType } from "@/lib/constants";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { deadlineCountdownLabel, daysUntilWorkflowDeadline, workflowDeadline } from "@/lib/tva";
import { formatDate } from "@/lib/utils";

export default async function PublicUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: {
      firm: true,
      client: true,
      collectionPeriod: true,
      requiredDocuments: { orderBy: { createdAt: "asc" } },
      uploadedDocuments: { orderBy: { createdAt: "desc" } }
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
    eventTitle: "Lien de depot ouvert",
    eventDescription: `${item.client.companyName} a ouvert le lien de depot.`,
    metadata: { collectionStatus: item.collectionPeriod.status },
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent"),
    source: "PUBLIC_UPLOAD_PAGE"
  });
  const requiredDocs = item.requiredDocuments.filter((doc) => doc.isRequired);
  const completedDocs = requiredDocs.filter((doc) => doc.status === "RECEIVED");
  const missingDocs = requiredDocs.filter((doc) => doc.status === "MISSING");
  const rejectedDocs = item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus));
  const progress = requiredDocs.length ? Math.round((completedDocs.length / requiredDocs.length) * 100) : 100;
  const workflowTemplate = workflowTemplateFromType(item.collectionPeriod.workflowType);
  const deadline = workflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const daysRemaining = daysUntilWorkflowDeadline(item.collectionPeriod.workflowType, item.collectionPeriod.year, item.collectionPeriod.month);
  const nextAction = rejectedDocs[0]
    ? `Remplacer ou clarifier le fichier ${rejectedDocs[0].originalFileName}.`
    : missingDocs[0]
      ? `Deposer le document suivant : ${missingDocs[0].name}.`
      : "Confirmer que tous les documents disponibles ont ete deposes.";

  if (item.collectionPeriod.status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-white px-4 py-6">
        <div className="mx-auto grid max-w-2xl gap-6">
          <header className="border-b border-border pb-4">
            {item.firm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Firm logos can be arbitrary external URLs in the pilot.
              <img src={item.firm.logoUrl} alt={item.firm.name} className="mb-4 max-h-14 max-w-48 object-contain" />
            ) : null}
            <div className="text-sm font-bold text-primary">Cabinet: {item.firm.name}</div>
            <h1 className="mt-2 text-2xl font-black">Collecte indisponible</h1>
            <p className="mt-3 text-sm text-muted">
              Cette collecte n&apos;est pas ouverte aux depots pour le moment. Veuillez contacter votre cabinet.
            </p>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto grid max-w-2xl gap-6">
        <header className="border-b border-border pb-4">
          {item.firm.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Firm logos can be arbitrary external URLs in the pilot.
            <img src={item.firm.logoUrl} alt={item.firm.name} className="mb-4 max-h-14 max-w-48 object-contain" />
          ) : null}
          <div className="text-sm font-bold text-primary">Cabinet: {item.firm.name}</div>
          <h1 className="mt-2 text-2xl font-black">Deposez vos documents ici</h1>
          <div className="mt-3 grid gap-1 text-sm text-muted">
            <p><span className="font-bold text-ink">Client:</span> {item.client.companyName}</p>
            <p><span className="font-bold text-ink">Demande:</span> {workflowTemplate.label} - {monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}</p>
            {item.firm.phone || item.firm.email ? (
              <p><span className="font-bold text-ink">Contact cabinet:</span> {[item.firm.phone, item.firm.email].filter(Boolean).join(" - ")}</p>
            ) : null}
          </div>
        </header>

        <section className="card p-4">
          <div className="rounded-md border border-primary/20 bg-slate-50 p-4">
            <h2 className="font-black">Bienvenue sur le portail de depot de votre cabinet comptable</h2>
            <p className="mt-2 text-sm text-muted">
              Deposez ici les documents demandes pour eviter les pertes sur WhatsApp ou email. Aucun compte n&apos;est necessaire.
            </p>
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <div className="rounded-md border border-border bg-white p-3"><span className="font-black">1.</span> Verifiez les documents demandes</div>
              <div className="rounded-md border border-border bg-white p-3"><span className="font-black">2.</span> Ajoutez des fichiers lisibles</div>
              <div className="rounded-md border border-border bg-white p-3"><span className="font-black">3.</span> Confirmez et gardez la preuve</div>
            </div>
          </div>
        </section>

        <section className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Vos obligations</h2>
              <p className="mt-1 text-sm text-muted">
                {completedDocs.length} complete(s) / {requiredDocs.length} demande(s)
              </p>
            </div>
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <Clock size={16} />
                {deadlineCountdownLabel(daysRemaining)}
              </div>
              <div className="mt-1 text-xs text-muted">Echeance estimee: {formatDate(deadline)}</div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-sm font-bold">{progress}% du dossier complete</div>
          <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-black">Prochaine action</div>
              <div>{nextAction}</div>
            </div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-black">Documents demandes</h2>
          <div className="grid gap-2">
            {item.requiredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                {doc.status === "RECEIVED" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-400" />}
                <span className="flex-1 font-bold">{doc.name}</span>
                <StatusBadge status={doc.status === "MISSING" ? "MISSING_DOC" : doc.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-black">Regles simples pour eviter les retards</h2>
          <div className="grid gap-3">
            {clientEducationMessages.map((message) => (
              <div key={message.title} className="rounded-md border border-border p-3">
                <div className="font-black">{message.title}</div>
                <p className="mt-1 text-sm text-muted">{message.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-4 font-black">Ajouter des fichiers</h2>
          <UploadForm token={token} requiredDocuments={item.requiredDocuments} />
          <p className="mt-3 text-xs text-muted">Formats acceptes : PDF, JPG, PNG, XLS, XLSX, DOC, DOCX. Maximum 10 Mo par fichier.</p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-black">Fichiers deja recus</h2>
          <div className="grid gap-2">
            {item.uploadedDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span className="font-bold">{document.originalFileName}</span>
                </div>
                <span className="text-xs text-muted">{formatDate(document.createdAt)}</span>
              </div>
            ))}
            {!item.uploadedDocuments.length ? (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-muted">
                <CheckCircle2 size={16} />
                Aucun fichier depose pour le moment.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
