import { AlertTriangle, CheckCircle2, Circle, ClipboardCheck, FileSearch, PhoneCall, Rocket, Trophy } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { buildAdoptionSnapshot } from "@/lib/adoption";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();
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
    urgentClients
  ] = await Promise.all([
    prisma.client.count({ where: { firmId: user.firmId } }),
    prisma.client.count({ where: { firmId: user.firmId, phone: null, email: null } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, status: "ACTIVE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId } }),
    prisma.operationalEvent.count({ where: { firmId: user.firmId, eventType: "COLLECTION_REPORT_EXPORTED" } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId } }),
    prisma.reminderLog.count({ where: { firmId: user.firmId } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, status: "CLOSED" } }),
    prisma.requiredDocument.count({ where: { firmId: user.firmId, isRequired: true, status: "MISSING" } }),
    prisma.collectionPeriod.findMany({
      where: { firmId: user.firmId, status: "ACTIVE" },
      include: {
        clientCollections: {
          include: {
            uploadedDocuments: true
          }
        }
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 5
    }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, status: "COMPLETE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, status: { in: ["MISSING", "NOT_STARTED", "IN_PROGRESS"] } } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, qualityStatus: "UNREVIEWED" } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, qualityStatus: { notIn: ["UNREVIEWED", "VALID"] } } }),
    prisma.uploadedDocument.findMany({
      where: { firmId: user.firmId },
      include: { clientCollection: { include: { client: true, collectionPeriod: true } }, requiredDocument: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.clientCollection.findMany({
      where: { firmId: user.firmId, collectionPeriod: { status: "ACTIVE" }, status: { in: ["MISSING", "NOT_STARTED", "IN_PROGRESS"] } },
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        uploadedDocuments: { orderBy: { createdAt: "desc" }, take: 1 },
        reminderLogs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: [{ updatedAt: "asc" }],
      take: 6
    })
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
    pendingReviews ? `Verifier ${pendingReviews} document(s) en attente` : null,
    invalidDocuments ? `Traiter ${invalidDocuments} document(s) invalide(s)` : null,
    riskyCollections.length ? `Revoir ${riskyCollections.length} collecte(s) a risque` : null,
    noContactClients ? `Completer le contact de ${noContactClients} client(s)` : null
  ].filter((action): action is string => Boolean(action));

  const criticalNotes = [
    riskyCollections[0]
      ? `${riskyCollections[0].collection.name}: ${deadlineRiskLabel(riskyCollections[0].risk).toLowerCase()}, ${deadlineCountdownLabel(riskyCollections[0].daysRemaining).toLowerCase()}`
      : null,
    urgentClients.length ? `${urgentClients.length} client(s) doivent etre relances` : null,
    pendingReviews ? `${pendingReviews} document(s) attendent le controle cabinet` : null,
    invalidDocuments ? `${invalidDocuments} document(s) sont marques invalides` : null
  ].filter((note): note is string => Boolean(note));
  const activationItems = [
    {
      label: "Completer le profil cabinet",
      done: Boolean(user.firm.city && user.firm.phone && user.firm.email),
      href: "/app/settings",
      cta: "Completer"
    },
    {
      label: "Ajouter le logo du cabinet",
      done: Boolean(user.firm.logoUrl),
      href: "/app/settings",
      cta: "Ajouter logo"
    },
    {
      label: "Ajouter ou importer des clients",
      done: clients > 0,
      href: "/app/clients",
      cta: "Ajouter clients"
    },
    {
      label: "Creer la premiere collecte TVA",
      done: totalCollections > 0,
      href: "/app/collections",
      cta: "Creer collecte"
    },
    {
      label: "Generer le premier lien de depot",
      done: uploadLinks > 0,
      href: "/app/collections",
      cta: "Selectionner clients"
    },
    {
      label: "Recevoir le premier document",
      done: uploads.length > 0,
      href: "/app/documents",
      cta: "Voir documents"
    },
    {
      label: "Exporter le premier rapport",
      done: exportedReports > 0,
      href: "/app/reports",
      cta: "Exporter"
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Tableau de bord</h1>
          <p className="text-sm text-muted">Suivi rapide des collectes TVA en cours.</p>
        </div>
        <Link href="/app/collections" className="btn btn-primary">
          Nouvelle collecte
        </Link>
      </div>

      {!activationComplete ? (
        <section className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-primary">Activation</div>
              <h2 className="mt-1 text-xl font-black">Configuration: {completedActivation}/{activationItems.length} terminee</h2>
              <p className="mt-1 text-sm text-muted">Atteignez vite le premier resultat: creer une collecte, envoyer un lien, recevoir un document.</p>
            </div>
            {nextActivationItem ? (
              <Link href={nextActivationItem.href} className="btn btn-primary">{nextActivationItem.cta}</Link>
            ) : null}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${activationProgress}%` }} />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {activationItems.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm hover:bg-slate-50">
                {item.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-400" />}
                <span className={item.done ? "font-bold text-slate-500 line-through" : "font-bold"}>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {uploads.length ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-black">Premier document recu</h2>
              <p className="mt-1 text-sm">Votre collecte fonctionne: les clients peuvent deposer leurs documents et le cabinet peut les suivre.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Rocket size={16} />
            Adoption cabinet
          </div>
          <div className="mt-3 text-4xl font-black">{adoption.score}/100</div>
          <div className="mt-1 text-sm font-black">{adoption.label}</div>
          <div className="mt-4 rounded-md border border-border p-3 text-sm">
            <div className="font-black">Level {adoption.level.number}: {adoption.level.name}</div>
            <p className="mt-1 text-muted">{adoption.level.description}</p>
          </div>
          <Link href={adoption.nextStep.href} className="btn btn-primary mt-4 w-full justify-center">
            {adoption.nextStep.cta}
          </Link>
          <p className="mt-2 text-sm text-muted">{adoption.nextStep.label}</p>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Trophy size={16} />
                First Month Success
              </div>
              <h2 className="mt-2 text-xl font-black">Transformer l&apos;essai en habitude</h2>
            </div>
            <div className={cn(
              "rounded-md border px-3 py-2 text-sm font-black",
              adoption.adoptionRisk.level === "Healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
            )}>
              {adoption.adoptionRisk.level}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">{adoption.adoptionRisk.reason} {adoption.adoptionRisk.action}</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {adoption.firstMonthTargets.map((target) => (
              <div key={target.label} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <div className="font-bold">{target.label}</div>
                  <div className="text-xs text-muted">{target.value} / {target.target}</div>
                </div>
                {target.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-sm font-bold text-primary">Owner Value Dashboard</div>
            <h2 className="mt-2 text-xl font-black">Pourquoi TVA Collect vaut le coup</h2>
            <p className="mt-2 text-sm text-muted">{adoption.value.story}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Temps estime economise</div>
              <div className="mt-1 text-2xl font-black">{adoption.value.estimatedTimeSavedHours}h</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Valeur estimee</div>
              <div className="mt-1 text-2xl font-black">{adoption.value.estimatedValueMad} MAD</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Documents portail</div>
              <div className="mt-1 text-2xl font-black">{totalUploadedDocuments}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Relances generees</div>
              <div className="mt-1 text-2xl font-black">{totalRemindersGenerated}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <AlertTriangle size={16} />
              Brief du matin
            </div>
            <h2 className="mt-2 text-xl font-black">Situation cabinet aujourd&apos;hui</h2>
            <div className="mt-4 grid gap-3">
              {criticalNotes.map((note) => (
                <div key={note} className="rounded-md border border-border bg-slate-50 p-3 text-sm font-bold">
                  {note}
                </div>
              ))}
              {!criticalNotes.length ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                  Rien de critique pour le moment.
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="font-black">Actions du jour</h3>
            <div className="mt-3 grid gap-2">
              {todayActions.map((action, index) => (
                <div key={action} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{index + 1}</span>
                  <span className="font-bold">{action}</span>
                </div>
              ))}
              {!todayActions.length ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                  <ClipboardCheck size={16} />
                  Aucun traitement prioritaire.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Clients", clients],
          ["Collectes actives", activeCollections],
          ["Dossiers complets", complete],
          ["A traiter", missing]
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-sm font-bold text-muted">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <PhoneCall size={16} />
            Clients a relancer
          </div>
          <div className="mt-2 text-3xl font-black">{urgentClients.length}</div>
          <p className="mt-1 text-sm text-muted">Actifs, incomplets ou sans depot.</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <FileSearch size={16} />
            Documents a controler
          </div>
          <div className="mt-2 text-3xl font-black">{pendingReviews}</div>
          <p className="mt-1 text-sm text-muted">Depots non verifies par le cabinet.</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <AlertTriangle size={16} />
            Collectes a risque
          </div>
          <div className="mt-2 text-3xl font-black">{riskyCollections.length}</div>
          <p className="mt-1 text-sm text-muted">Risque eleve ou critique avant echeance.</p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-black">Collectes a risque</h2>
            <p className="text-sm text-muted">Les periodes actives qui demandent une decision rapide.</p>
          </div>
          <Link href="/app/collections" className="btn">Voir toutes</Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Echeance</th>
                <th>Clients incomplets</th>
                <th>Documents invalides</th>
                <th>Risque</th>
              </tr>
            </thead>
            <tbody>
              {riskyCollections.map(({ collection, daysRemaining, incompleteClients, invalid, risk }) => (
                <tr key={collection.id}>
                  <td><Link className="font-bold" href={`/app/collections/${collection.id}`}>{collection.name}</Link></td>
                  <td>
                    <div className="font-bold">{deadlineCountdownLabel(daysRemaining)}</div>
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
                <tr><td colSpan={5} className="text-muted">Aucune collecte en risque eleve pour le moment.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-black">Clients a relancer</h2>
            <p className="text-sm text-muted">Dossiers actifs avec documents manquants ou aucun depot.</p>
          </div>
          <Link href="/app/collections" className="btn">Voir collectes</Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Collecte</th>
                <th>Manquants</th>
                <th>Derniere relance</th>
                <th>Dernier depot</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {urgentClients.map((item) => {
                const missingDocs = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
                return (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-bold" href={`/app/clients/${item.clientId}`}>{item.client.companyName}</Link>
                      <div className="text-xs text-muted">{item.client.phone || item.client.email || "-"}</div>
                    </td>
                    <td><Link href={`/app/collections/${item.collectionPeriodId}`}>{item.collectionPeriod.name}</Link></td>
                    <td>{missingDocs.length}</td>
                    <td>{formatDate(item.reminderLogs[0]?.createdAt)}</td>
                    <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                );
              })}
              {!urgentClients.length ? (
                <tr><td colSpan={6} className="text-muted">Aucun client urgent pour le moment.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Derniers depots</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
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
                  <td><StatusBadge status={doc.clientCollection.status} /></td>
                </tr>
              ))}
              {!uploads.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">Aucun depot pour le moment.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
