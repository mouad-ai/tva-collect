import { Prisma, UserRole } from "@prisma/client";
import { disableUser, enableUser } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireAdmin } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string; role?: string; state?: string; page?: string; limit?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const role = params.role && Object.values(UserRole).includes(params.role as UserRole) ? (params.role as UserRole) : undefined;
  const where: Prisma.UserWhereInput = {
    role,
    isActive: params.state === "active" ? true : params.state === "disabled" ? false : undefined,
    OR: params.search ? [
      { name: { contains: params.search, mode: "insensitive" as const } },
      { email: { contains: params.search, mode: "insensitive" as const } },
      { firm: { name: { contains: params.search, mode: "insensitive" as const } } }
    ] : undefined
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
    include: { firm: true },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Utilisateurs</h1>
        <p className="text-sm text-muted">Comptes plateforme et comptes cabinets. Les clients ne sont pas des utilisateurs.</p>
      </div>

      <section className="card min-w-0 overflow-hidden">
        {/* UX-FIX: admin users table has search/filter/pagination and destructive confirmations. */}
        <SearchFilterForm
          searchPlaceholder="Rechercher utilisateur, email, cabinet"
          filters={[
            { name: "role", label: "Role", value: params.role, options: [{ value: "", label: "Tous" }, ...Object.values(UserRole).map((role) => ({ value: role, label: roleLabel(role) }))] },
            { name: "state", label: "Etat", value: params.state, options: [{ value: "", label: "Tous" }, { value: "active", label: "Actif" }, { value: "disabled", label: "Désactivé" }] }
          ]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!users.length ? (
          <div className="p-4">
            <EmptyState title="Aucun utilisateur trouve" description="Essayez un autre filtre ou creez un cabinet avec propriétaire." actionHref="/admin/firms/new" actionLabel="Nouveau cabinet" />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Role</th>
                <th>Cabinet</th>
                <th>Etat</th>
                <th>Cree le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-bold">{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge border-slate-200 bg-slate-50 text-slate-700">
                      <span className="badge-dot" aria-hidden="true" />
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td>{user.role === UserRole.ADMIN ? "Plateforme" : user.firm?.name || "-"}</td>
                  <td>
                    <span className={cn("badge", user.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                      <span className="badge-dot" aria-hidden="true" />
                      {user.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    {user.role !== UserRole.ADMIN ? (
                      user.isActive ? (
                        <form action={disableUser.bind(null, user.id)}>
                          <input type="hidden" name="disabledReason" value="Désactivé par administrateur SaaS" />
                          <ConfirmSubmitButton message={`Désactiver ${user.email} ?`} className="btn btn-danger">Désactiver</ConfirmSubmitButton>
                        </form>
                      ) : (
                        <form action={enableUser.bind(null, user.id)}>
                          <button className="btn">Réactiver</button>
                        </form>
                      )
                    ) : "-"}
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
