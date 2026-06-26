import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      clientCollections: {
        include: { collectionPeriod: true, requiredDocuments: true, uploadedDocuments: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!client) {
    return <div className="card p-6">Client introuvable.</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/clients" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Clients</Link>
          <h1 className="text-2xl font-black">{client.companyName}</h1>
          <p className="text-sm text-muted">Fiche client, historique et documents TVA.</p>
        </div>
        <form action={deleteClientAction.bind(null, client.id)}>
          <button className="btn btn-danger"><Trash2 size={16} /> Supprimer</button>
        </form>
      </div>

      <section className="card p-4">
        <h2 className="mb-4 font-black">Informations client</h2>
        <form action={updateClientAction.bind(null, client.id)} className="grid gap-4">
          <div className="field-grid">
            <label>Societe<input name="companyName" defaultValue={client.companyName} required /></label>
            <label>Contact<input name="contactName" defaultValue={client.contactName || ""} /></label>
            <label>Telephone<input name="phone" defaultValue={client.phone || ""} /></label>
            <label>Email<input name="email" type="email" defaultValue={client.email || ""} /></label>
            <label>ICE<input name="ice" defaultValue={client.ice || ""} /></label>
            <label>IF<input name="taxId" defaultValue={client.taxId || ""} /></label>
            <label>Ville<input name="city" defaultValue={client.city || ""} /></label>
          </div>
          <label>Notes<textarea name="notes" rows={3} defaultValue={client.notes || ""} /></label>
          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Historique collectes</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Statut</th>
                <th>Documents recus</th>
                <th>Manquants</th>
                <th>Dernier depot</th>
              </tr>
            </thead>
            <tbody>
              {client.clientCollections.map((item) => (
                <tr key={item.id}>
                  <td><Link className="font-bold" href={`/app/collections/${item.collectionPeriodId}`}>{item.collectionPeriod.name}</Link></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.uploadedDocuments.length}</td>
                  <td>{item.requiredDocuments.filter((doc) => doc.status === "MISSING").length}</td>
                  <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                </tr>
              ))}
              {!client.clientCollections.length ? (
                <tr><td colSpan={5} className="text-muted">Aucune collecte pour ce client.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
