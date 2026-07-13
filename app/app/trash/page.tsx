import { RotateCcw } from "lucide-react";
import { restoreClientAction, restoreCollectionAction, restoreUploadedDocumentAction } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { UserRole } from "@prisma/client";

export default async function TrashPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const [clients, collections, documents] = await Promise.all([
    prisma.client.findMany({
      where: {
        firmId: user.firmId,
        deletedAt: { not: null },
        OR: search ? [
          { companyName: { contains: search, mode: "insensitive" } },
          { deleteReason: { contains: search, mode: "insensitive" } }
        ] : undefined
      },
      orderBy: { deletedAt: "desc" },
      take: 500
    }),
    prisma.collectionPeriod.findMany({
      where: {
        firmId: user.firmId,
        deletedAt: { not: null },
        OR: search ? [
          { name: { contains: search, mode: "insensitive" } },
          { deleteReason: { contains: search, mode: "insensitive" } }
        ] : undefined
      },
      orderBy: { deletedAt: "desc" },
      take: 500
    }),
    prisma.uploadedDocument.findMany({
      where: {
        firmId: user.firmId,
        deletedAt: { not: null },
        OR: search ? [
          { originalFileName: { contains: search, mode: "insensitive" } },
          { deleteReason: { contains: search, mode: "insensitive" } },
          { clientCollection: { client: { companyName: { contains: search, mode: "insensitive" } } } }
        ] : undefined
      },
      include: { clientCollection: { include: { client: true, collectionPeriod: true } } },
      orderBy: { deletedAt: "desc" },
      take: 500
    })
  ]);
  const items = [
    ...clients.map((client) => ({ id: client.id, type: "client", label: client.companyName, context: "Client", deletedAt: client.deletedAt, reason: client.deleteReason })),
    ...collections.map((collection) => ({ id: collection.id, type: "collection", label: collection.name, context: "Collecte", deletedAt: collection.deletedAt, reason: collection.deleteReason })),
    ...documents.map((document) => ({ id: document.id, type: "document", label: document.originalFileName, context: `${document.clientCollection.client.companyName} - ${document.clientCollection.collectionPeriod.name}`, deletedAt: document.deletedAt, reason: document.deleteReason }))
  ]
    .filter((item) => params.type ? item.type === params.type : true)
    .sort((a, b) => (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0));
  const paginatedItems = items.slice((page - 1) * limit, page * limit);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Corbeille</h1>
        <p className="text-sm text-muted">Éléments supprimés récupérables. Les fichiers ne sont pas purgés automatiquement.</p>
      </div>

      <section className="card min-w-0 overflow-hidden">
        <SearchFilterForm
          searchPlaceholder="Rechercher élément supprimé"
          filters={[{ name: "type", label: "Type", value: params.type, options: [
            { value: "", label: "Tous les types" },
            { value: "client", label: "Clients" },
            { value: "collection", label: "Collectes" },
            { value: "document", label: "Documents" }
          ] }]}
        />
        <PaginationControls total={items.length} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Élément</th>
                <th>Type</th>
                <th>Contexte</th>
                <th>Supprimé le</th>
                <th>Raison</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => {
                const action = item.type === "client"
                  ? restoreClientAction.bind(null, item.id)
                  : item.type === "collection"
                    ? restoreCollectionAction.bind(null, item.id)
                    : restoreUploadedDocumentAction.bind(null, item.id);
                return (
                  <tr key={`${item.type}-${item.id}`}>
                    <td className="font-bold">{item.label}</td>
                    <td>{item.type === "client" ? "Client" : item.type === "collection" ? "Collecte" : "Document"}</td>
                    <td>{item.context}</td>
                    <td>{formatDate(item.deletedAt)}</td>
                    <td>{item.reason || "-"}</td>
                    <td><form action={action}><button className="btn"><RotateCcw size={16} /> Restaurer</button></form></td>
                  </tr>
                );
              })}
              {!paginatedItems.length ? <tr><td colSpan={6}><EmptyState title="Corbeille vide" description="Aucun élément supprimé ne correspond aux filtres." /></td></tr> : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={items.length} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
