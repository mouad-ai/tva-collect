import Link from "next/link";
import { FirmStatus, Prisma } from "@prisma/client";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireAdmin } from "@/lib/auth";
import { firmStatusLabel, planLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Cabinets" };

export default async function AdminFirmsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; plan?: string; page?: string; limit?: string; sort?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const status = params.status && Object.values(FirmStatus).includes(params.status as FirmStatus) ? (params.status as FirmStatus) : undefined;
  const where: Prisma.FirmWhereInput = {
    status,
    plan: params.plan || undefined,
    OR: params.search ? [
      { name: { contains: params.search, mode: "insensitive" as const } },
      { city: { contains: params.search, mode: "insensitive" as const } },
      { email: { contains: params.search, mode: "insensitive" as const } }
    ] : undefined
  };
  const [firms, total] = await Promise.all([
    prisma.firm.findMany({
      where,
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, clients: true, collectionPeriods: true, uploadedDocuments: true } }
    },
      orderBy: params.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.firm.count({ where })
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Cabinets</h1>
          <p className="text-sm text-muted">Cabinets inscrits et usage principal.</p>
        </div>
        <Link href="/admin/firms/new" className="btn btn-primary">Nouveau cabinet</Link>
      </div>

      <section className="card min-w-0 overflow-hidden">
        {/* UX-FIX: admin firms table uses URL filters and server-side pagination. */}
        <SearchFilterForm
          searchPlaceholder="Rechercher cabinet, ville, email"
          filters={[
            { name: "status", label: "Statut", value: params.status, options: [
              { value: "", label: "Tous" },
              { value: "TRIAL", label: "Essai" },
              { value: "ACTIVE", label: "Actif" },
              { value: "OVERDUE", label: "En retard" },
              { value: "SUSPENDED", label: "Suspendu" },
              { value: "CANCELLED", label: "Annulé" }
            ] },
            { name: "plan", label: "Plan", value: params.plan, options: [{ value: "", label: "Tous" }, { value: "STARTER", label: "Démarrage" }, { value: "PRO", label: "Pro" }, { value: "PREMIUM", label: "Premium" }] },
            { name: "sort", label: "Tri", value: params.sort, options: [{ value: "", label: "Recent" }, { value: "name", label: "Nom" }] }
          ]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!firms.length ? (
          <div className="p-4">
            <EmptyState title={params.search ? "Aucun cabinet trouvé" : "Aucun cabinet"} description={params.search ? "Essayez un autre filtre ou effacez la recherche." : "Créez le premier cabinet et son propriétaire pour démarrer."} actionHref="/admin/firms/new" actionLabel="Nouveau cabinet" />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cabinet</th>
                <th>Propriétaire</th>
                <th>Ville</th>
                <th>Plan</th>
                <th>Statut</th>
                <th>Clients</th>
                <th>Collectes</th>
                <th>Documents</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {firms.map((firm) => (
                <tr key={firm.id}>
                  <td><Link className="font-bold" href={`/admin/firms/${firm.id}`}>{firm.name}</Link></td>
                  <td>{firm.users.find((user) => user.role === "OWNER")?.email || firm.users[0]?.email || "-"}</td>
                  <td>{firm.city || "-"}</td>
                  <td>{planLabel(firm.plan)}</td>
                  <td>{firmStatusLabel(firm.status)}</td>
                  <td>{firm._count.clients}</td>
                  <td>{firm._count.collectionPeriods}</td>
                  <td>{firm._count.uploadedDocuments}</td>
                  <td>{formatDate(firm.createdAt)}</td>
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
