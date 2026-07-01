import { cancelInvite, resendInvite } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireAdmin } from "@/lib/auth";
import { inviteUrl } from "@/lib/invites";
import { roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminInvitesPage({ searchParams }: { searchParams: Promise<{ created?: string; search?: string; state?: string; page?: string; limit?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const { created } = params;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const now = new Date();
  const where = {
    email: params.search ? { contains: params.search, mode: "insensitive" as const } : undefined,
    acceptedAt: params.state === "accepted" ? { not: null } : params.state === "pending" ? null : undefined,
    revokedAt: params.state === "revoked" ? { not: null } : undefined,
    expiresAt: params.state === "expired" ? { lt: now } : undefined
  };
  const [invites, total] = await Promise.all([
    prisma.userInvite.findMany({
      where,
    include: { firm: true },
    orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.userInvite.count({ where })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Invitations</h1>
        <p className="text-sm text-muted">Liens de configuration mot de passe pour propriétaires et équipe cabinet.</p>
      </div>

      {created ? (
        <section className="card border-green-200 bg-green-50 p-4">
          <div className="font-black text-green-800">Lien d&apos;invitation cree</div>
          <p className="mt-1 text-sm text-green-800">Copiez ce lien et envoyez-le au propriétaire du cabinet.</p>
          <code className="mt-3 block overflow-x-auto rounded-md bg-white p-3 text-sm">{inviteUrl(created)}</code>
        </section>
      ) : null}

      <section className="card min-w-0 overflow-hidden">
        {/* UX-FIX: invitations table has server-side pagination, filters and cancel confirmation. */}
        <SearchFilterForm
          searchPlaceholder="Rechercher email"
          filters={[{ name: "state", label: "Etat", value: params.state, options: [
            { value: "", label: "Tous" },
            { value: "pending", label: "En attente" },
            { value: "accepted", label: "Acceptee" },
            { value: "revoked", label: "Revoquee" },
            { value: "expired", label: "Expiree" }
          ] }]}
        />
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
        {!invites.length ? (
          <div className="p-4">
            <EmptyState title="Aucune invitation trouvee" description="Effacez les filtres ou creez un nouveau cabinet avec propriétaire." actionHref="/admin/firms/new" actionLabel="Nouveau cabinet" />
          </div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Role</th>
                <th>Cabinet</th>
                <th>Expire le</th>
                <th>Etat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const expired = invite.expiresAt < new Date();
                const state = invite.acceptedAt ? "Acceptee" : invite.revokedAt ? "Revoquee" : expired ? "Expiree" : "Active";
                return (
                  <tr key={invite.id}>
                    <td className="font-bold">{invite.email}</td>
                    <td>{invite.name || "-"}</td>
                    <td><span className="status-badge">{roleLabel(invite.role)}</span></td>
                    <td>{invite.firm.name}</td>
                    <td>{formatDate(invite.expiresAt)}</td>
                    <td>{state}</td>
                    <td className="flex flex-wrap gap-2">
                      {!invite.acceptedAt ? (
                        <>
                          <form action={resendInvite.bind(null, invite.id)}><button className="btn">Renvoyer</button></form>
                          {!invite.revokedAt ? <form action={cancelInvite.bind(null, invite.id)}><ConfirmSubmitButton message={`Annulér l'invitation ${invite.email} ?`}>Annulér</ConfirmSubmitButton></form> : null}
                        </>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
        <PaginationControls total={total} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}
