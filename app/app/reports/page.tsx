import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { buildClientComplianceProfile } from "@/lib/client-compliance";
import { monthNames } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireUser();
  const [collections, missingDocuments, reminders, invalidDocuments, clients] = await Promise.all([
    prisma.collectionPeriod.findMany({
      where: { firmId: user.firmId },
      include: { clientCollections: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12
    }),
    prisma.requiredDocument.count({ where: { firmId: user.firmId, isRequired: true, status: "MISSING" } }),
    prisma.reminderLog.count({ where: { firmId: user.firmId } }),
    prisma.uploadedDocument.count({ where: { firmId: user.firmId, qualityStatus: { notIn: ["UNREVIEWED", "VALID"] } } }),
    prisma.client.findMany({
      where: { firmId: user.firmId },
      include: {
        clientCollections: {
          include: { collectionPeriod: true, requiredDocuments: true, uploadedDocuments: true, reminderLogs: true }
        }
      },
      orderBy: { companyName: "asc" },
      take: 200
    })
  ]);
  const clientBehavior = clients
    .map((client) => ({ client, compliance: buildClientComplianceProfile(client.clientCollections) }))
    .sort((a, b) => a.compliance.score - b.compliance.score);
  const difficultClients = clientBehavior.slice(0, 5);
  const bestClients = [...clientBehavior].sort((a, b) => b.compliance.score - a.compliance.score).slice(0, 5);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Rapports</h1>
        <p className="text-sm text-muted">Suivi des collectes, documents manquants, relances et controles.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Documents manquants</div>
          <div className="mt-2 text-3xl font-black">{missingDocuments}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Relances generees</div>
          <div className="mt-2 text-3xl font-black">{reminders}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Documents invalides</div>
          <div className="mt-2 text-3xl font-black">{invalidDocuments}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-black">Clients a risque</h2>
            <p className="text-sm text-muted">Score bas, relances frequentes ou documents invalides.</p>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Score</th>
                  <th>Relances</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {difficultClients.map(({ client, compliance }) => (
                  <tr key={client.id}>
                    <td><Link className="font-bold" href={`/app/clients/${client.id}`}>{client.companyName}</Link></td>
                    <td>{compliance.score}/100</td>
                    <td>{compliance.averageReminders}</td>
                    <td>{compliance.serviceTier}</td>
                  </tr>
                ))}
                {!difficultClients.length ? <tr><td colSpan={4} className="text-muted">Pas encore assez de donnees client.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-black">Clients les plus propres</h2>
            <p className="text-sm text-muted">Clients qui demandent peu de relances et deposent des fichiers exploitables.</p>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Score</th>
                  <th>Tendance</th>
                  <th>Retard moyen</th>
                </tr>
              </thead>
              <tbody>
                {bestClients.map(({ client, compliance }) => (
                  <tr key={client.id}>
                    <td><Link className="font-bold" href={`/app/clients/${client.id}`}>{client.companyName}</Link></td>
                    <td>{compliance.score}/100</td>
                    <td>{compliance.trend}</td>
                    <td>{compliance.averageDelayDays ?? 0} j</td>
                  </tr>
                ))}
                {!bestClients.length ? <tr><td colSpan={4} className="text-muted">Pas encore assez de donnees client.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Progression des collectes</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Periode</th>
                <th>Clients</th>
                <th>Complets</th>
                <th>Progression</th>
                <th>Statut</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const complete = collection.clientCollections.filter((item) => item.status === "COMPLETE").length;
                const progress = collection.clientCollections.length ? Math.round((complete / collection.clientCollections.length) * 100) : 0;
                return (
                  <tr key={collection.id}>
                    <td><Link className="font-bold" href={`/app/collections/${collection.id}`}>{collection.name}</Link></td>
                    <td>{monthNames[collection.month - 1]} {collection.year}</td>
                    <td>{collection.clientCollections.length}</td>
                    <td>{complete}</td>
                    <td>{progress}%</td>
                    <td><StatusBadge status={collection.status} /></td>
                    <td><a className="btn" href={`/api/collections/${collection.id}/export.csv`}>CSV</a></td>
                  </tr>
                );
              })}
              {!collections.length ? (
                <tr><td colSpan={7} className="text-muted">Aucune collecte a analyser. Creez une collecte TVA pour generer les premiers rapports.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
