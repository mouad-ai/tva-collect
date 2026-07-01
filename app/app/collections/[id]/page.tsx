import { Check, Download, ExternalLink, FileDown, FileText } from "lucide-react";
import { CollectionStatus, RequiredDocumentStatus } from "@prisma/client";
import Link from "next/link";
import { addClientsToCollectionAction, markClientCollectionCompleteAction, markRequiredDocumentAction, updateClientCollectionNotesAction, updateCollectionStatusAction } from "@/app/actions";
import { BulkReminderButton } from "@/components/BulkReminderButton";
import { CopyButton } from "@/components/CopyButton";
import { PaginationControls } from "@/components/PaginationControls";
import { ReminderButton } from "@/components/ReminderButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { StatusBadge } from "@/components/StatusBadge";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clientCloseRisk, deadlineCountdownLabel, deadlineRiskLabel, daysUntilWorkflowDeadline, workflowDeadline } from "@/lib/tva";
import { cn, formatDate, uploadUrl } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-700"
};

export default async function CollectionDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const { id } = await params;
  const tableParams = await searchParams;
  const page = Math.max(1, Number(tableParams.page || 1));
  const limit = [10, 25, 50].includes(Number(tableParams.limit)) ? Number(tableParams.limit) : 10;
  const search = tableParams.search?.trim().toLowerCase();
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId, deletedAt: null },
    include: {
      clientCollections: {
        where: { deletedAt: null },
        include: {
          client: true,
          requiredDocuments: { orderBy: { createdAt: "asc" } },
          uploadedDocuments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
          reminderLogs: { orderBy: { createdAt: "desc" }, take: 3 }
        },
        orderBy: { client: { companyName: "asc" } }
      }
    }
  });
  const clients = await prisma.client.findMany({ where: { firmId: user.firmId, deletedAt: null }, orderBy: { companyName: "asc" } });

  if (!collection) {
    return <div className="card p-6">Collecte introuvable.</div>;
  }

  const existingClientIds = new Set(collection.clientCollections.map((item) => item.clientId));
  const availableClients = clients.filter((client) => !existingClientIds.has(client.id));
  const filteredClientCollections = collection.clientCollections.filter((item) => {
    const matchesStatus = tableParams.status ? item.status === tableParams.status : true;
    const matchesSearch = search
      ? `${item.client.companyName} ${item.client.phone || ""} ${item.client.email || ""} ${item.accountantNotes || ""}`.toLowerCase().includes(search)
      : true;
    return matchesStatus && matchesSearch;
  });
  const paginatedClientCollections = filteredClientCollections.slice((page - 1) * limit, page * limit);
  const workflowTemplate = workflowTemplateFromType(collection.workflowType);
  const deadline = workflowDeadline(collection.workflowType, collection.year, collection.month);
  const daysRemaining = daysUntilWorkflowDeadline(collection.workflowType, collection.year, collection.month);
  const linkOpenEvents = await prisma.operationalEvent.findMany({
    where: {
      firmId: user.firmId,
      collectionId: collection.id,
      eventType: "CLIENT_OPENED_LINK"
    },
    orderBy: { occurredAt: "desc" },
    select: { clientCollectionId: true, occurredAt: true },
    take: 500
  });
  const linkOpenByClientCollection = new Map<string, { count: number; latest: Date }>();
  for (const event of linkOpenEvents) {
    if (!event.clientCollectionId) continue;
    const existing = linkOpenByClientCollection.get(event.clientCollectionId);
    linkOpenByClientCollection.set(event.clientCollectionId, {
      count: (existing?.count || 0) + 1,
      latest: existing?.latest || event.occurredAt
    });
  }

  return (
    <div className="content-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{collection.name}</h1>
          <p className="text-sm text-muted">
            {workflowTemplate.label} - {monthNames[collection.month - 1]} {collection.year} - {collection.clientCollections.length} clients - échéance estimee {formatDate(deadline)}
          </p>
          <div className="mt-2"><StatusBadge status={collection.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`/api/collections/${collection.id}/export.csv`}><FileDown size={16} /> Export CSV</a>
          <BulkReminderButton collectionId={collection.id} />
          <Link href="/app/collections" className="btn">Collectes</Link>
        </div>
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold">Ouverture des liens</h2>
            <p className="text-sm text-muted">Les clients peuvent déposer uniquement quand la collecte est active.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={updateCollectionStatusAction.bind(null, collection.id, CollectionStatus.DRAFT)}>
              <button className="btn" disabled={collection.status === "DRAFT"}>Brouillon</button>
            </form>
            <form action={updateCollectionStatusAction.bind(null, collection.id, CollectionStatus.ACTIVE)}>
              <button className="btn btn-primary" disabled={collection.status === "ACTIVE"}>Activer</button>
            </form>
            <form action={updateCollectionStatusAction.bind(null, collection.id, CollectionStatus.CLOSED)}>
              <button className="btn btn-danger" disabled={collection.status === "CLOSED"}>Clôturer</button>
            </form>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-extrabold">Ajouter des clients a la collecte</h2>
        {availableClients.length ? (
          <form action={addClientsToCollectionAction.bind(null, collection.id)} className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              {availableClients.map((client) => (
                <label key={client.id} className="flex flex-row items-center gap-2 rounded-md border border-border p-3">
                  <input className="w-4" type="checkbox" name="clientIds" value={client.id} />
                  <span>{client.companyName}</span>
                </label>
              ))}
            </div>
            <button className="btn btn-primary w-fit">Ajouter a la collecte</button>
          </form>
        ) : (
          <p className="text-sm text-muted">Tous les clients existants sont deja dans cette collecte.</p>
        )}
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Suivi des dossiers</h2>
        </div>
        <SearchFilterForm
          searchPlaceholder="Rechercher client, telephone, note"
          filters={[{ name: "status", label: "Statut", value: tableParams.status, options: [
            { value: "", label: "Tous les statuts" },
            { value: "NOT_STARTED", label: "Pas commence" },
            { value: "IN_PROGRESS", label: "En cours" },
            { value: "MISSING", label: "Documents manquants" },
            { value: "COMPLETE", label: "Complet" },
            { value: "CLOSED", label: "Cloture" }
          ] }]}
        />
        <PaginationControls total={filteredClientCollections.length} page={page} limit={limit} searchParams={tableParams} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Lien dépôt</th>
                <th>Documents manquants</th>
                <th>Documents reçus</th>
                <th>Statut</th>
                <th>Dernier dépôt</th>
                <th>Échéance</th>
                <th>Risque</th>
                <th>Notes internes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientCollections.map((item) => {
                const missing = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
                const received = item.requiredDocuments.filter((doc) => doc.status === "RECEIVED");
                const invalidDocs = item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;
                const clientRisk = clientCloseRisk({
                  daysRemaining,
                  status: item.status,
                  missingDocumentsCount: missing.length,
                  invalidDocumentsCount: invalidDocs,
                  uploadCount: item.uploadedDocuments.length
                });
                const link = uploadUrl(item.uploadToken);
                const linkOpen = linkOpenByClientCollection.get(item.id);
                const linkSent = item.reminderLogs.length > 0;
                return (
                  <tr key={item.id}>
                    <td className="min-w-[180px]">
                      <Link className="font-bold" href={`/app/clients/${item.clientId}`}>{item.client.companyName}</Link>
                      <div className="text-xs text-muted">{item.client.phone || item.client.email || "-"}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton text={link} label="Copier le lien" />
                        <a className="btn" href={link} target="_blank" rel="noreferrer" title="Ouvrir"><ExternalLink size={16} /></a>
                      </div>
                      <div className="mt-2 text-xs">
                        {linkOpen ? (
                          <span className="font-bold text-emerald-700">Ouvert {linkOpen.count} fois - {formatDate(linkOpen.latest)}</span>
                        ) : linkSent ? (
                          <span className="font-bold text-amber-700">Relance envoyee, lien jamais ouvert</span>
                        ) : (
                          <span className="text-muted">Pas encore ouvert</span>
                        )}
                      </div>
                    </td>
                    <td className="min-w-[220px]">
                      <div className="mb-2 text-xs font-black text-amber-700">{missing.length} manquant(s)</div>
                      <div className="grid gap-2">
                        {missing.map((doc) => (
                          <form key={doc.id} action={markRequiredDocumentAction.bind(null, doc.id, RequiredDocumentStatus.RECEIVED)} className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2 py-1 text-sm">
                            <span>{doc.name}</span>
                            <button className="btn min-h-0 px-2 py-1 text-xs" title="Marquer reçu"><Check size={14} /></button>
                          </form>
                        ))}
                        {!missing.length ? <span className="text-sm text-muted">Aucun</span> : null}
                      </div>
                    </td>
                    <td>{received.length ? received.map((doc) => doc.name).join(", ") : "-"}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                    <td>
                      <div className="font-bold">{deadlineCountdownLabel(daysRemaining)}</div>
                      <div className="text-xs text-muted">{formatDate(deadline)}</div>
                    </td>
                    <td className="min-w-[170px]">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", riskTone[clientRisk.risk])}>
                        {deadlineRiskLabel(clientRisk.risk)}
                      </span>
                      <div className="mt-2 text-xs text-muted">{clientRisk.nextAction}</div>
                    </td>
                    <td className="min-w-[260px]">
                      <form action={updateClientCollectionNotesAction.bind(null, item.id)} className="grid gap-2">
                        <textarea name="accountantNotes" rows={3} defaultValue={item.accountantNotes || ""} placeholder="Ex: client promet lundi, rélevé bancaire manque" />
                        <button className="btn w-fit">Sauver note</button>
                      </form>
                      {item.reminderLogs.length ? (
                        <div className="mt-3 grid gap-1 text-xs text-muted">
                          {item.reminderLogs.map((log) => (
                            <div key={log.id}>{log.channel} - {formatDate(log.createdAt)}</div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="flex min-w-[280px] flex-wrap gap-2">
                        <ReminderButton clientCollectionId={item.id} channel="WHATSAPP" />
                        <ReminderButton clientCollectionId={item.id} channel="EMAIL" />
                        <Link className="btn" href={`/app/documents?clientId=${item.clientId}&collectionPeriodId=${collection.id}`} title="Documents">
                          <FileText size={16} /> Documents
                        </Link>
                        <Link className="btn" href={`/app/tva-readiness/${item.id}`} title="TVA Readiness">
                          TVA Readiness
                        </Link>
                        <form action={markClientCollectionCompleteAction.bind(null, item.id)}>
                          <button className="btn" title="Marquer complet"><Check size={16} /> Complet</button>
                        </form>
                        {item.uploadedDocuments[0] ? (
                          <a className="btn" href={`/api/documents/${item.uploadedDocuments[0].id}/download`} title="Dernier fichier"><Download size={16} /></a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedClientCollections.length ? (
                <tr><td colSpan={10} className="text-muted">Aucun dossier client ne correspond aux filtres.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={filteredClientCollections.length} page={page} limit={limit} searchParams={tableParams} />
      </section>
    </div>
  );
}
