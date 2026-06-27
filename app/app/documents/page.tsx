import { Download } from "lucide-react";
import { classifyUploadedDocumentAction, updateUploadedDocumentQualityAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string; collectionPeriodId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [clients, collections, documents] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } }),
    prisma.collectionPeriod.findMany({ where: { firmId: user.firmId }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.uploadedDocument.findMany({
      where: {
        firmId: user.firmId,
        clientCollection: {
          clientId: params.clientId || undefined,
          collectionPeriodId: params.collectionPeriodId || undefined
        }
      },
      include: {
        requiredDocument: true,
        clientCollection: { include: { client: true, collectionPeriod: true, requiredDocuments: { orderBy: { createdAt: "asc" } } } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Documents</h1>
        <p className="text-sm text-muted">Tous les fichiers deposes par les clients.</p>
      </div>

      <section className="card p-4">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label>
            Client
            <select name="clientId" defaultValue={params.clientId || ""}>
              <option value="">Tous les clients</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
            </select>
          </label>
          <label>
            Collecte
            <select name="collectionPeriodId" defaultValue={params.collectionPeriodId || ""}>
              <option value="">Toutes les collectes</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
          </label>
          <button className="btn">Filtrer</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Client</th>
                <th>Collecte</th>
                <th>Classification</th>
                <th>Controle</th>
                <th>Accuse client</th>
                <th>Taille</th>
                <th>Date depot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="font-bold">{document.originalFileName}</td>
                  <td>{document.clientCollection.client.companyName}</td>
                  <td>{document.clientCollection.collectionPeriod.name}</td>
                  <td className="min-w-[240px]">
                    <form action={classifyUploadedDocumentAction.bind(null, document.id)} className="flex gap-2">
                      <select name="requiredDocumentId" defaultValue={document.requiredDocumentId || ""}>
                        <option value="">Autre / non classe</option>
                        {document.clientCollection.requiredDocuments.map((doc) => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                      <button className="btn">OK</button>
                    </form>
                  </td>
                  <td className="min-w-[320px]">
                    <form action={updateUploadedDocumentQualityAction.bind(null, document.id)} className="grid gap-2">
                      <select name="qualityStatus" defaultValue={document.qualityStatus}>
                        <option value="UNREVIEWED">A verifier</option>
                        <option value="VALID">Valide</option>
                        <option value="WRONG_DOCUMENT">Mauvais document</option>
                        <option value="UNREADABLE">Illisible</option>
                        <option value="DUPLICATE">Doublon</option>
                        <option value="MISSING_PAGE">Page manquante</option>
                        <option value="NOT_TVA">Hors TVA</option>
                      </select>
                      <div className="flex gap-2">
                        <input name="accountantComment" defaultValue={document.accountantComment || ""} placeholder="Commentaire interne" />
                        <button className="btn">OK</button>
                      </div>
                    </form>
                  </td>
                  <td className="min-w-[220px] text-sm">
                    {document.clientAcknowledgedDelayRisk ? (
                      <div>
                        <div className="font-bold text-emerald-700">Confirme</div>
                        <div className="text-xs text-muted">{formatDate(document.clientAcknowledgedAt)}</div>
                      </div>
                    ) : (
                      <span className="text-muted">Non confirme</span>
                    )}
                  </td>
                  <td>{formatBytes(document.size)}</td>
                  <td>{formatDate(document.createdAt)}</td>
                  <td><a className="btn" href={`/api/documents/${document.id}/download`}><Download size={16} /> Telecharger</a></td>
                </tr>
              ))}
              {!documents.length ? (
                <tr><td colSpan={9} className="text-muted">Aucun document trouve.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
