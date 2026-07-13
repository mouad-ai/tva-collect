import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClientAction, deleteClientAction } from "@/app/actions";
import { ClientImportForm } from "@/components/ClientImportForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string; limit?: string; sort?: string }> }) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const orderBy = params.sort === "createdAt" ? { createdAt: "desc" as const } : { companyName: "asc" as const };
  const where = {
    firmId: user.firmId,
    deletedAt: null,
    OR: search
      ? [
          { companyName: { contains: search, mode: "insensitive" as const } },
          { contactName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { ice: { contains: search, mode: "insensitive" as const } }
        ]
      : undefined
  };
  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
    include: { clientCollections: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.client.count({ where })
  ]);

  return (
    <div className="content-stack">
      <PageHeader
        title="Clients"
        description="Ajoutez, importez et retrouvez les dossiers clients de votre cabinet."
      />

      <section id="new-client" className="card p-5">
        <h2 className="mb-4 font-extrabold">Nouveau client</h2>
        <form action={createClientAction} className="grid gap-4">
          <div className="field-grid">
            <label>Société <span className="required-mark">*</span><input name="companyName" required /></label>
            <label>Contact<input name="contactName" /></label>
            <label>Téléphone<input name="phone" /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>ICE<input name="ice" /></label>
            <label>IF<input name="taxId" /></label>
            <label>Ville<input name="city" /></label>
          </div>
          <label>Notes<textarea name="notes" rows={2} /></label>
          {/* UX-FIX: submit buttons show pending state and prevent double-submit. */}
          <PendingSubmitButton><Plus size={16} /> Nouveau client</PendingSubmitButton>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-extrabold">Importer clients</h2>
        <p className="mb-4 text-sm text-muted">Import CSV depuis Excel avec aperçu et détection des doublons par ICE ou societe.</p>
        <ClientImportForm />
      </section>

      <section className="card min-w-0 overflow-hidden">
        {/* UX-FIX: server-side search/sort/pagination controls at top and bottom. */}
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Liste clients</h2>
        </div>
        <SearchFilterForm
          searchPlaceholder="Rechercher client, ICE, email"
          filters={[{ name: "sort", label: "Tri", value: params.sort, options: [{ value: "", label: "Nom A-Z" }, { value: "createdAt", label: "Creation recente" }] }]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!clients.length ? (
          <div className="p-4">
            <EmptyState
              icon={Plus}
              title={search ? "Aucun client trouve" : "Aucun client pour le moment"}
              description={search ? "Essayez un autre nom, email ou ICE." : "Ajoutez votre premier client ou importez une liste CSV pour commencer une collecte TVA."}
              actionHref={search ? "/app/clients" : "/app/clients#new-client"}
              actionLabel={search ? "Reinitialiser la recherche" : "Ajouter un client"}
            />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Société</th>
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>ICE</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-bold"><Link href={`/app/clients/${client.id}`}>{client.companyName}</Link></td>
                  <td>{client.contactName || "-"}</td>
                  <td>{client.phone || "-"}</td>
                  <td>{client.email || "-"}</td>
                  <td>{client.ice || "-"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/app/clients/${client.id}`} className="btn" title="Modifier"><Pencil size={16} /></Link>
                      <form action={deleteClientAction.bind(null, client.id)}>
                        <ConfirmSubmitButton message={`Supprimer le client ${client.companyName} ?`}><Trash2 size={16} /></ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

