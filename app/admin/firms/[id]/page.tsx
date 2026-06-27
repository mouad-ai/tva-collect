import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function AdminFirmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const firm = await prisma.firm.findUnique({
    where: { id },
    include: {
      users: true,
      clients: { orderBy: { createdAt: "desc" }, take: 8 },
      collectionPeriods: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 8 },
      uploadedDocuments: { select: { size: true } },
      _count: { select: { clients: true, collectionPeriods: true } }
    }
  });
  if (!firm) notFound();
  const storage = firm.uploadedDocuments.reduce((sum, document) => sum + document.size, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">{firm.name}</h1>
        <p className="text-sm text-muted">{firm.city || "Ville non renseignee"} - cree le {formatDate(firm.createdAt)}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4"><div className="text-sm font-bold text-muted">Users</div><div className="mt-2 text-3xl font-black">{firm.users.length}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Clients</div><div className="mt-2 text-3xl font-black">{firm._count.clients}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Collectes</div><div className="mt-2 text-3xl font-black">{firm._count.collectionPeriods}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Stockage</div><div className="mt-2 text-3xl font-black">{formatBytes(storage)}</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-black">Utilisateurs</h2>
          <div className="grid gap-2 text-sm">
            {firm.users.map((user) => <div key={user.id} className="rounded-md border border-border p-3"><span className="font-bold">{user.name}</span> - {user.email}</div>)}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-black">Collectes recentes</h2>
          <div className="grid gap-2 text-sm">
            {firm.collectionPeriods.map((collection) => <div key={collection.id} className="rounded-md border border-border p-3"><span className="font-bold">{collection.name}</span> - {collection.status}</div>)}
            {!firm.collectionPeriods.length ? <p className="text-muted">Aucune collecte.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
