import { Check, Download, ExternalLink, FileDown, Link as LinkIcon } from "lucide-react";
import { RequiredDocumentStatus } from "@prisma/client";
import Link from "next/link";
import { addClientsToCollectionAction, markClientCollectionCompleteAction, markRequiredDocumentAction } from "@/app/actions";
import { CopyButton } from "@/components/CopyButton";
import { ReminderButton } from "@/components/ReminderButton";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { monthNames } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate, uploadUrl } from "@/lib/utils";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      clientCollections: {
        include: {
          client: true,
          requiredDocuments: { orderBy: { createdAt: "asc" } },
          uploadedDocuments: { orderBy: { createdAt: "desc" } }
        },
        orderBy: { client: { companyName: "asc" } }
      }
    }
  });
  const clients = await prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } });

  if (!collection) {
    return <div className="card p-6">Collecte introuvable.</div>;
  }

  const existingClientIds = new Set(collection.clientCollections.map((item) => item.clientId));
  const availableClients = clients.filter((client) => !existingClientIds.has(client.id));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{collection.name}</h1>
          <p className="text-sm text-muted">{monthNames[collection.month - 1]} {collection.year} · {collection.clientCollections.length} clients</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`/api/collections/${collection.id}/export.csv`}><FileDown size={16} /> Export CSV</a>
          <Link href="/app/collections" className="btn">Collectes</Link>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="mb-4 font-black">Ajouter des clients a la collecte</h2>
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

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Suivi des dossiers</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Lien depot</th>
                <th>Documents manquants</th>
                <th>Documents recus</th>
                <th>Statut</th>
                <th>Dernier depot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collection.clientCollections.map((item) => {
                const missing = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
                const received = item.requiredDocuments.filter((doc) => doc.status === "RECEIVED");
                const link = uploadUrl(item.uploadToken);
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
                    </td>
                    <td className="min-w-[220px]">
                      <div className="grid gap-2">
                        {missing.map((doc) => (
                          <form key={doc.id} action={markRequiredDocumentAction.bind(null, doc.id, RequiredDocumentStatus.RECEIVED)} className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2 py-1 text-sm">
                            <span>{doc.name}</span>
                            <button className="btn min-h-0 px-2 py-1 text-xs" title="Marquer recu"><Check size={14} /></button>
                          </form>
                        ))}
                        {!missing.length ? <span className="text-sm text-muted">Aucun</span> : null}
                      </div>
                    </td>
                    <td>{received.length ? received.map((doc) => doc.name).join(", ") : "-"}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                    <td>
                      <div className="flex min-w-[280px] flex-wrap gap-2">
                        <ReminderButton clientCollectionId={item.id} channel="WHATSAPP" />
                        <ReminderButton clientCollectionId={item.id} channel="EMAIL" />
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
              {!collection.clientCollections.length ? (
                <tr><td colSpan={7} className="text-muted">Ajoutez des clients pour generer leurs liens de depot.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
