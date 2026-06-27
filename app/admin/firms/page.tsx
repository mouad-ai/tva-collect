import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminFirmsPage() {
  await requireAdmin();
  const firms = await prisma.firm.findMany({
    include: {
      users: { orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { users: true, clients: true, collectionPeriods: true, uploadedDocuments: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Firms</h1>
        <p className="text-sm text-muted">Cabinets inscrits et usage principal.</p>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Cabinet</th>
                <th>Owner</th>
                <th>Ville</th>
                <th>Clients</th>
                <th>Collectes</th>
                <th>Documents</th>
                <th>Cree le</th>
              </tr>
            </thead>
            <tbody>
              {firms.map((firm) => (
                <tr key={firm.id}>
                  <td><Link className="font-bold" href={`/admin/firms/${firm.id}`}>{firm.name}</Link></td>
                  <td>{firm.users[0]?.email || "-"}</td>
                  <td>{firm.city || "-"}</td>
                  <td>{firm._count.clients}</td>
                  <td>{firm._count.collectionPeriods}</td>
                  <td>{firm._count.uploadedDocuments}</td>
                  <td>{formatDate(firm.createdAt)}</td>
                </tr>
              ))}
              {!firms.length ? <tr><td colSpan={7} className="text-muted">Aucun cabinet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
