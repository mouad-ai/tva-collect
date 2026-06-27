import { Plus } from "lucide-react";
import Link from "next/link";
import { createCollectionAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType, workflowTemplates } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { collectionCloseRisk, deadlineCountdownLabel, deadlineRiskLabel, daysUntilWorkflowDeadline, workflowDeadline } from "@/lib/tva";
import { cn, formatDate } from "@/lib/utils";

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-700"
};

export default async function CollectionsPage() {
  const user = await requireUser();
  const [collections, clients] = await Promise.all([
    prisma.collectionPeriod.findMany({
      where: { firmId: user.firmId },
      include: { clientCollections: { include: { uploadedDocuments: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    }),
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { companyName: "asc" } })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Collectes</h1>
        <p className="text-sm text-muted">Creez une periode de travail et envoyez les liens de depot.</p>
      </div>

      <section className="card p-4">
        <h2 className="mb-4 font-black">Nouvelle collecte</h2>
        <form action={createCollectionAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_190px_150px_150px_auto] md:items-end">
            <label>Nom<input name="name" placeholder="TVA Juillet 2026" required /></label>
            <label>
              Type
              <select name="workflowType" defaultValue="TVA_MONTHLY">
                {workflowTemplates.map((template) => (
                  <option key={template.type} value={template.type}>{template.label}</option>
                ))}
              </select>
            </label>
            <label>Mois<select name="month" defaultValue="6">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
            <label>Annee<input name="year" type="number" defaultValue="2026" required /></label>
            <button className="btn btn-primary"><Plus size={16} /> Creer</button>
          </div>
          {clients.length ? (
            <div>
              <div className="mb-2 text-sm font-bold text-muted">Clients a inclure maintenant</div>
              <div className="grid max-h-72 gap-2 overflow-auto rounded-md border border-border p-3 md:grid-cols-2">
                {clients.map((client) => (
                  <label key={client.id} className="flex flex-row items-center gap-2 rounded-md border border-border p-2">
                    <input className="w-4" type="checkbox" name="clientIds" value={client.id} />
                    <span>{client.companyName}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Ajoutez ou importez des clients avant de generer les liens en masse.</p>
          )}
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Periodes</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Periode</th>
                <th>Workflow</th>
                <th>Mois</th>
                <th>Clients</th>
                <th>Complets</th>
                <th>A traiter</th>
                <th>Echeance</th>
                <th>Risque</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const complete = collection.clientCollections.filter((item) => item.status === "COMPLETE").length;
                const missing = collection.clientCollections.length - complete;
                const invalidDocuments = collection.clientCollections.reduce((count, item) => {
                  return count + item.uploadedDocuments.filter((document) => !["UNREVIEWED", "VALID"].includes(document.qualityStatus)).length;
                }, 0);
                const deadline = workflowDeadline(collection.workflowType, collection.year, collection.month);
                const daysRemaining = daysUntilWorkflowDeadline(collection.workflowType, collection.year, collection.month);
                const risk = collectionCloseRisk({
                  daysRemaining,
                  totalClients: collection.clientCollections.length,
                  incompleteClients: missing,
                  invalidDocuments
                });
                return (
                  <tr key={collection.id}>
                    <td><Link className="font-bold" href={`/app/collections/${collection.id}`}>{collection.name}</Link></td>
                    <td>{workflowTemplateFromType(collection.workflowType).label}</td>
                    <td>{monthNames[collection.month - 1]} {collection.year}</td>
                    <td>{collection.clientCollections.length}</td>
                    <td>{complete}</td>
                    <td>{missing}</td>
                    <td>
                      <div className="font-bold">{deadlineCountdownLabel(daysRemaining)}</div>
                      <div className="text-xs text-muted">{formatDate(deadline)}</div>
                    </td>
                    <td>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", riskTone[risk])}>
                        {deadlineRiskLabel(risk)}
                      </span>
                    </td>
                    <td><StatusBadge status={collection.status} /></td>
                  </tr>
                );
              })}
              {!collections.length ? (
                <tr><td colSpan={9} className="text-muted">Aucune collecte creee.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
