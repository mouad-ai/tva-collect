import { AlertTriangle, CheckCircle2, Circle, ClipboardCheck, FileSearch, PhoneCall, Rocket, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { buildAdoptionSnapshot } from "@/lib/adoption";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectionCloseRisk, deadlineCountdownLabel, deadlineRiskLabel, daysUntilTvaDeadline, tvaDeadline } from "@/lib/tva";
import { cn, formatDate } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-700"
};

export default async function DashboardPage() {
  const user = await requireFirmUser();
  const [
    clients,
    noContactClients,
    totalCollections,
    activeCollections,
    uploadLinks,
    exportedReports,
    totalUploadedDocuments,
    totalRemindersGenerated,
    closedCollections,
    missingRequiredDocuments,
    activeCollectionDetails,
    complete,
    missing,
    pendingReviews,
    invalidDocuments,
    uploads,
    urgentClients,
    reviewedDocuments,
    teamInvites
  ] = await Promise.all([
    prisma.client.count({ where: { firmId: user.firmId, deletedAt: null } }),
    prisma.client.count({ where: { firmId: user.firmId, deletedAt: null, phone: null, email: null } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, deletedAt: null } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, deletedAt: null, status: "ACTIVE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, deletedAt: null } }),
    prisma.operationalEvent.count({ where: { firmId: user.firmId, eventType: "COLLECTION_REPORT_EXPORTED" } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, deletedAt: null } }),
    prisma.reminderLog.count({ where: { firmId: user.firmId } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, deletedAt: null, status: "CLOSED" } }),
    prisma.requiredDocument.count({ where: { firmId: user.firmId, isRequired: true, status: "MISSING" } }),
    prisma.collectionPeriod.findMany({
      where: { firmId: user.firmId, deletedAt: null, status: "ACTIVE" },
      include: {
        clientCollections: {
          where: { deletedAt: null },
          include: {
            uploadedDocuments: { where: { deletedAt: null } }
          }
        }
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 5
    }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, deletedAt: null, status: "COMPLETE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, deletedAt: null, status: { in: ["MISSING", "NOT_STARTED", "IN_PROGRESS"] } } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, deletedAt: null, qualityStatus: "UNREVIEWED" } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, deletedAt: null, qualityStatus: { notIn: ["UNREVIEWED", "VALID"] } } }),
    prisma.uploadedDocument.findMany({
      where: { firmId: user.firmId, deletedAt: null },
      include: { clientCollection: { include: { client: true, collectionPeriod: true } }, requiredDocument: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.clientCollection.findMany({
      where: { firmId: user.firmId, deletedAt: null, collectionPeriod: { status: "ACTIVE", deletedAt: null }, status: { in: ["MISSING", "NOT_STARTED", "IN_PROGRESS"] } },
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        uploadedDocuments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        reminderLogs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: [{ updatedAt: "asc" }],
      take: 6
    }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, deletedAt: null, qualityStatus: { not: "UNREVIEWED" } } }),
    prisma.userInvite.count({ where: { firmId: user.firmId } })
  ]);

  const riskyCollections = activeCollectionDetails
    .map((collection) => {
      const incompleteClients = collection.clientCollections.filter((item) => item.status !== "COMPLETE").length;
      const invalid = collection.clientCollections.reduce((count, item) => {
        return count + item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;
      }, 0);
      const daysRemaining = daysUntilTvaDeadline(collection.year, collection.month);
      const risk = collectionCloseRisk({
        daysRemaining,
        totalClients: collection.clientCollections.length,
        incompleteClients,
        invalidDocuments: invalid
      });
      return { collection, daysRemaining, incompleteClients, invalid, risk };
    })
    .filter((item) => item.risk === "HIGH" || item.risk === "CRITICAL");

  const todayActions = [
    urgentClients.length ? `Relancer ${urgentClients.length} client(s) incomplet(s)` : null,
    pendingReviews ? `Vérifier ${pendingReviews} document(s) en attente` : null,
    invalidDocuments ? `Traiter ${invalidDocuments} document(s) invalide(s)` : null,
    riskyCollections.length ? `Revoir ${riskyCollections.length} collecte(s) à risque` : null,
    noContactClients ? `Compléter le contact de ${noContactClients} client(s)` : null
  ].filter((action): action is string => Boolean(action));

  const criticalNotes = [
    riskyCollections[0]
      ? `${riskyCollections[0].collection.name} : ${deadlineRiskLabel(riskyCollections[0].risk).toLowerCase()}, ${deadlineCountdownLabel(riskyCollections[0].daysRemaining).toLowerCase()}`
      : null,
    urgentClients.length ? `${urgentClients.length} client(s) à relancer` : null,
    pendingReviews ? `${pendingReviews} document(s) attendent le contrôle cabinet` : null,
    invalidDocuments ? `${invalidDocuments} document(s) marqués invalides` : null
  ].filter((note): note is string => Boolean(note));

  const activationItems = [
    {
      label: "Créer votre premier client",
      done: clients > 0,
      href: "/app/clients",
      cta: "Ajouter un client"
    },
    {
      label: "Créer une période de collecte TVA",
      done: totalCollections > 0,
      href: "/app/collections",
      cta: "Créer une collecte"
    },
    {
      label: "Partager un lien de dépôt avec un client",
      done: uploadLinks > 0,
      href: "/app/collections",
      cta: "Sélectionner des clients"
    },
    {
      label: "Recevoir un premier document",
      done: uploads.length > 0,
      href: "/app/documents",
      cta: "Voir les documents"
    },
    {
      label: "Valider ou rejeter un document",
      done: reviewedDocuments > 0,
      href: "/app/documents",
      cta: "Contrôler les documents"
    },
    {
      label: "Envoyer une première relance",
      done: totalRemindersGenerated > 0,
      href: "/app/reminders",
      cta: "Envoyer une relance"
    },
    {
      label: "Inviter un membre de l'équipe",
      done: teamInvites > 0,
      href: "/app/settings/team",
      cta: "Inviter l'équipe"
    }
  ];
  const completedActivation = activationItems.filter((item) => item.done).length;
  const activationComplete = completedActivation === activationItems.length;
  const nextActivationItem = activationItems.find((item) => !item.done);
  const activationProgress = Math.round((completedActivation / activationItems.length) * 100);
  const adoption = buildAdoptionSnapshot({
    clients,
    totalCollections,
    activeCollections,
    uploadLinks,
    documentsUploaded: totalUploadedDocuments,
    remindersGenerated: totalRemindersGenerated,
    exportedReports,
    closedCollections,
    missingDocumentsDetected: missingRequiredDocuments,
    invalidDocumentsDetected: invalidDocuments
  });

  const riskBadgeClass =
    adoption.adoptionRisk.level === "Healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : adoption.adoptionRisk.level === "Watch"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className="content-stack">
      <PageHeader
        label="Cabinet"
        title="Tableau de bord"
        description="Vue d'ensemble de vos collectes TVA, relances et dossiers à traiter."
        actions={
          <Link href="/app/collections" className="btn btn-primary">
            Nouvelle collecte
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Clients", clients, "Dossiers actifs"],
          ["Collectes actives", activeCollections, "Périodes en cours"],
          ["Dossiers complets", complete, "Prêts pour contrôle"],
          ["À traiter", missing, "Incomplets ou en cours"]
        ].map(([label, value, note]) => (
          <div key={label} className="stat-card">
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-note">{note}</div>
          </div>
        ))}
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="section-label">Brief du matin</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight">Situation cabinet aujourd&apos;hui</h2>
            <div className="mt-4 grid gap-2">
              {criticalNotes.map((note) => (
                <div key={note} className="rounded-lg border border-border bg-surface px-3 py-3 text-sm font-medium">
                  {note}
                </div>
              ))}
              {!criticalNotes.length ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-800">
                  Rien de critique pour le moment.
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <h3 className="font-extrabold">Actions du jour</h3>
            <div className="mt-3 grid gap-2">
              {todayActions.map((action, index) => (
                <div key={action} className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="font-medium">{action}</span>
                </div>
              ))}
              {!todayActions.length ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-800">
                  <ClipboardCheck size={16} />
                  Aucun traitement prioritaire.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {!activationComplete ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-label">Activation</p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight">
                Configuration : {completedActivation}/{activationItems.length} terminée
              </h2>
              <p className="mt-2 text-sm text-muted">
                Le cycle complet : client, collecte, lien de dépôt, document reçu, contrôle, relance et équipe.
              </p>
            </div>
            {nextActivationItem ? (
              <Link href={nextActivationItem.href} className="btn btn-primary">
                {nextActivationItem.cta}
              </Link>
            ) : null}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${activationProgress}%` }} />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {activationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm transition hover:bg-surface"
              >
                {item.done ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={18} className="shrink-0 text-slate-400" />
                )}
                <span className={item.done ? "font-medium text-slate-500 line-through" : "font-medium"}>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Rocket size={16} className="text-primary" />
            <p className="section-label">Adoption</p>
          </div>
          <div className="mt-3 text-4xl font-extrabold tracking-tight">{adoption.score}/100</div>
          <div className="mt-1 text-sm font-semibold">{adoption.label}</div>
          <div className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">
            <div className="font-extrabold">
              Niveau {adoption.level.number} : {adoption.level.name}
            </div>
            <p className="mt-1 text-muted">{adoption.level.description}</p>
          </div>
          <Link href={adoption.nextStep.href} className="btn btn-primary mt-4 w-full justify-center">
            {adoption.nextStep.cta}
          </Link>
          <p className="mt-2 text-sm text-muted">{adoption.nextStep.label}</p>
        </div>

        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <p className="section-label">Premier mois</p>
              </div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight">Transformer l&apos;essai en habitude</h2>
            </div>
            <div className={cn("rounded-lg border px-3 py-2 text-sm font-bold", riskBadgeClass)}>
              {adoption.adoptionRisk.label}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            {adoption.adoptionRisk.reason} {adoption.adoptionRisk.action}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {adoption.firstMonthTargets.map((target) => (
              <div key={target.label} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm">
                <div>
                  <div className="font-medium">{target.label}</div>
                  <div className="text-xs text-muted">
                    {target.value} / {target.target}
                  </div>
                </div>
                {target.done ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={18} className="shrink-0 text-slate-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <p className="section-label">Impact cabinet</p>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight">Ce que TVA Collect vous fait gagner</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">{adoption.value.story}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Temps estimé économisé", `${adoption.value.estimatedTimeSavedHours}h`],
            ["Valeur estimée", `${adoption.value.estimatedValueMad} MAD`],
            ["Documents portail", String(totalUploadedDocuments)],
            ["Relances générées", String(totalRemindersGenerated)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-3 py-3">
              <div className="text-xs font-semibold text-muted">{label}</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 stat-card-label">
            <PhoneCall size={16} />
            Clients à relancer
          </div>
          <div className="stat-card-value">{urgentClients.length}</div>
          <div className="stat-card-note">Actifs, incomplets ou sans dépôt.</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 stat-card-label">
            <FileSearch size={16} />
            Documents à contrôler
          </div>
          <div className="stat-card-value">{pendingReviews}</div>
          <div className="stat-card-note">Dépôts non vérifiés par le cabinet.</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 stat-card-label">
            <AlertTriangle size={16} />
            Collectes à risque
          </div>
          <div className="stat-card-value">{riskyCollections.length}</div>
          <div className="stat-card-note">Risque élevé ou critique avant échéance.</div>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-extrabold">Collectes à risque</h2>
            <p className="text-sm text-muted">Périodes actives qui demandent une décision rapide.</p>
          </div>
          <Link href="/app/collections" className="btn">
            Voir toutes
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Échéance</th>
                <th>Clients incomplets</th>
                <th>Documents invalides</th>
                <th>Risque</th>
              </tr>
            </thead>
            <tbody>
              {riskyCollections.map(({ collection, daysRemaining, incompleteClients, invalid, risk }) => (
                <tr key={collection.id}>
                  <td>
                    <Link className="font-semibold hover:text-primary" href={`/app/collections/${collection.id}`}>
                      {collection.name}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium">{deadlineCountdownLabel(daysRemaining)}</div>
                    <div className="text-xs text-muted">{formatDate(tvaDeadline(collection.year, collection.month))}</div>
                  </td>
                  <td>{incompleteClients}</td>
                  <td>{invalid}</td>
                  <td>
                    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", riskTone[risk])}>
                      {deadlineRiskLabel(risk)}
                    </span>
                  </td>
                </tr>
              ))}
              {!riskyCollections.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Aucune collecte en risque élevé pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-extrabold">Clients à relancer</h2>
            <p className="text-sm text-muted">Dossiers actifs avec documents manquants ou aucun dépôt.</p>
          </div>
          <Link href="/app/collections" className="btn">
            Voir collectes
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Collecte</th>
                <th>Manquants</th>
                <th>Dernière relance</th>
                <th>Dernier dépôt</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {urgentClients.map((item) => {
                const missingDocs = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
                return (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-semibold hover:text-primary" href={`/app/clients/${item.clientId}`}>
                        {item.client.companyName}
                      </Link>
                      <div className="text-xs text-muted">{item.client.phone || item.client.email || "—"}</div>
                    </td>
                    <td>
                      <Link href={`/app/collections/${item.collectionPeriodId}`}>{item.collectionPeriod.name}</Link>
                    </td>
                    <td>{missingDocs.length}</td>
                    <td>{formatDate(item.reminderLogs[0]?.createdAt)}</td>
                    <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                );
              })}
              {!urgentClients.length ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    Aucun client urgent pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Derniers dépôts</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Collecte</th>
                <th>Document</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.clientCollection.client.companyName}</td>
                  <td>{doc.clientCollection.collectionPeriod.name}</td>
                  <td>{doc.requiredDocument?.name || doc.originalFileName}</td>
                  <td>{formatDate(doc.createdAt)}</td>
                  <td>
                    <StatusBadge status={doc.clientCollection.status} />
                  </td>
                </tr>
              ))}
              {!uploads.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Aucun dépôt pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
