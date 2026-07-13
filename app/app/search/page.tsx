import { FileText, FolderKanban, Search, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Recherche" };

export default async function GlobalSearchPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const query = params.search?.trim() || "";
  const type = params.type || "";

  const [clients, collections, documents] = query
    ? await Promise.all([
        type && type !== "clients" ? [] : prisma.client.findMany({
          where: {
            firmId: user.firmId,
            deletedAt: null,
            OR: [
              { companyName: { contains: query, mode: "insensitive" } },
              { contactName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { ice: { contains: query, mode: "insensitive" } }
            ]
          },
          orderBy: { companyName: "asc" },
          take: 10
        }),
        type && type !== "collections" ? [] : prisma.collectionPeriod.findMany({
          where: { firmId: user.firmId, deletedAt: null, name: { contains: query, mode: "insensitive" } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 10
        }),
        type && type !== "documents" ? [] : prisma.uploadedDocument.findMany({
          where: { firmId: user.firmId, deletedAt: null, originalFileName: { contains: query, mode: "insensitive" } },
          include: { clientCollection: { include: { client: true, collectionPeriod: true } } },
          orderBy: { createdAt: "desc" },
          take: 10
        })
      ])
    : [[], [], []];

  const hasResults = clients.length || collections.length || documents.length;

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Recherche globale</h1>
        <p className="text-sm text-muted">Recherchez clients, ICE, téléphone, collectes et documents.</p>
      </div>

      <section className="card min-w-0 overflow-hidden">
        {/* UX-FIX: header search button now opens a real global search page. */}
        <SearchFilterForm
          searchPlaceholder="Client, ICE, téléphone, document, collecte..."
          filters={[{ name: "type", label: "Type", value: type, options: [
            { value: "", label: "Tous" },
            { value: "clients", label: "Clients" },
            { value: "collections", label: "Collectes" },
            { value: "documents", label: "Documents" }
          ] }]}
        />
        {!query ? (
          <div className="p-4">
            <EmptyState icon={Search} title="Lancez une recherche" description="Tapez au moins un nom, ICE, téléphone, document ou collecte." />
          </div>
        ) : !hasResults ? (
          <div className="p-4">
            <EmptyState icon={Search} title="Aucun résultat" description="Essayez un autre mot-clé ou effacez les filtres." actionHref="/app/search" actionLabel="Effacer recherche" />
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {clients.length ? (
              <div className="grid gap-2">
                <h2 className="flex items-center gap-2 font-black"><Users size={17} /> Clients</h2>
                {clients.map((client) => <Link key={client.id} className="rounded-md border border-border p-3 hover:bg-slate-50" href={`/app/clients/${client.id}`}><span className="font-bold">{client.companyName}</span><span className="ml-2 text-sm text-muted">{client.ice || client.phone || client.email || ""}</span></Link>)}
              </div>
            ) : null}
            {collections.length ? (
              <div className="grid gap-2">
                <h2 className="flex items-center gap-2 font-black"><FolderKanban size={17} /> Collectes</h2>
                {collections.map((collection) => <Link key={collection.id} className="rounded-md border border-border p-3 hover:bg-slate-50" href={`/app/collections/${collection.id}`}><span className="font-bold">{collection.name}</span><span className="ml-2 text-sm text-muted">{collection.month}/{collection.year}</span></Link>)}
              </div>
            ) : null}
            {documents.length ? (
              <div className="grid gap-2">
                <h2 className="flex items-center gap-2 font-black"><FileText size={17} /> Documents</h2>
                {documents.map((document) => <Link key={document.id} className="rounded-md border border-border p-3 hover:bg-slate-50" href={`/app/documents?search=${encodeURIComponent(document.originalFileName)}`}><span className="font-bold">{document.originalFileName}</span><span className="ml-2 text-sm text-muted">{document.clientCollection.client.companyName} - {formatDate(document.createdAt)}</span></Link>)}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
