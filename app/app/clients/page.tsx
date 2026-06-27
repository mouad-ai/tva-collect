import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClientAction, deleteClientAction } from "@/app/actions";
import { ClientImportForm } from "@/components/ClientImportForm";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const search = params.search || "";
  const clients = await prisma.client.findMany({
    where: {
      firmId: user.firmId,
      OR: search
        ? [
            { companyName: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { ice: { contains: search, mode: "insensitive" } }
          ]
        : undefined
    },
    include: { clientCollections: true },
    orderBy: { companyName: "asc" }
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Clients</h1>
        <p className="text-sm text-muted">Ajoutez et retrouvez les dossiers clients du cabinet.</p>
      </div>

      <section className="card p-4">
        <h2 className="mb-4 font-black">Nouveau client</h2>
        <form action={createClientAction} className="grid gap-4">
          <div className="field-grid">
            <label>Societe<input name="companyName" required /></label>
            <label>Contact<input name="contactName" /></label>
            <label>Telephone<input name="phone" /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>ICE<input name="ice" /></label>
            <label>IF<input name="taxId" /></label>
            <label>Ville<input name="city" /></label>
          </div>
          <label>Notes<textarea name="notes" rows={2} /></label>
          <button className="btn btn-primary w-fit"><Plus size={16} /> Nouveau client</button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-black">Importer clients</h2>
        <p className="mb-4 text-sm text-muted">Import CSV depuis Excel avec apercu et detection des doublons par ICE ou societe.</p>
        <ClientImportForm />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="font-black">Liste clients</h2>
          <form className="flex min-w-[260px] gap-2">
            <input name="search" defaultValue={search} placeholder="Rechercher client, ICE, email" />
            <button className="btn" title="Rechercher"><Search size={16} /></button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Societe</th>
                <th>Contact</th>
                <th>Telephone</th>
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
                        <button className="btn btn-danger" title="Supprimer"><Trash2 size={16} /></button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!clients.length ? (
                <tr><td colSpan={6} className="text-muted">Aucun client trouve.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
