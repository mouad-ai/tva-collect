import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await requireUser();
  const [clients, activeCollections, complete, missing, uploads] = await Promise.all([
    prisma.client.count({ where: { firmId: user.firmId } }),
    prisma.collectionPeriod.count({ where: { firmId: user.firmId, status: "ACTIVE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, status: "COMPLETE" } }),
    prisma.clientCollection.count({ where: { firmId: user.firmId, status: { in: ["MISSING", "NOT_STARTED", "IN_PROGRESS"] } } }),
    prisma.uploadedDocument.findMany({
      where: { firmId: user.firmId },
      include: { clientCollection: { include: { client: true, collectionPeriod: true } }, requiredDocument: true },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Tableau de bord</h1>
          <p className="text-sm text-muted">Suivi rapide des collectes TVA en cours.</p>
        </div>
        <Link href="/app/collections" className="btn btn-primary">
          Nouvelle collecte
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Clients", clients],
          ["Collectes actives", activeCollections],
          ["Dossiers complets", complete],
          ["A traiter", missing]
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-sm font-bold text-muted">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Derniers depots</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Collecte</th>
                <th>Document</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.clientCollection.client.companyName}</td>
                  <td>{doc.clientCollection.collectionPeriod.name}</td>
                  <td>{doc.requiredDocument?.name || doc.originalFileName}</td>
                  <td>{formatDate(doc.createdAt)}</td>
                  <td><StatusBadge status={doc.clientCollection.status} /></td>
                </tr>
              ))}
              {!uploads.length ? (
                <tr>
                  <td colSpan={5} className="text-muted">Aucun depot pour le moment.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
