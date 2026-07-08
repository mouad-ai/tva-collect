import { Prisma, UserRole } from "@prisma/client";
import { cancelInvite, disableUser, enableUser, inviteFirmUser, resendInvite, transferOwnership } from "@/app/actions";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmAnyRole } from "@/lib/auth";
import { inviteUrl } from "@/lib/invites";
import { roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

const errorMessages: Record<string, string> = {
  "invalid-invite": "Invitation invalide. Vérifiez l'email et le role.",
  "email-exists": "Un utilisateur existe deja avec cet email."
};

export default async function TeamSettingsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string; search?: string; role?: string; page?: string; limit?: string }> }) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const params = await searchParams;
  const { created, error } = params;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const role = Object.values(UserRole).includes(params.role as UserRole) && params.role !== UserRole.ADMIN ? params.role as UserRole : undefined;
  const userWhere: Prisma.UserWhereInput = {
    firmId: user.firmId,
    role,
    OR: search ? [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ] : undefined
  };
  const [users, totalUsers, allUsersForTransfer, invites] = await Promise.all([
    prisma.user.findMany({ where: userWhere, orderBy: [{ role: "asc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.user.count({ where: userWhere }),
    prisma.user.findMany({ where: { firmId: user.firmId }, orderBy: [{ role: "asc" }, { createdAt: "desc" }] }),
    prisma.userInvite.findMany({ where: { firmId: user.firmId }, orderBy: { createdAt: "desc" } })
  ]);
  const transferableUsers = allUsersForTransfer.filter((teamUser) => teamUser.isActive && teamUser.id !== user.id && teamUser.role !== UserRole.ADMIN);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted">Invitez les utilisateurs du cabinet. Les clients utilisent uniquement les liens de dépôt.</p>
      </div>

      {created ? (
        <section className="card border-green-200 bg-green-50 p-4">
          <div className="font-black text-green-800">Lien d&apos;invitation cree</div>
          <code className="mt-3 block overflow-x-auto rounded-md bg-white p-3 text-sm">{inviteUrl(created)}</code>
        </section>
      ) : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessages[error] || "Action impossible."}</div> : null}

      <section className="card p-4">
        <h2 className="mb-3 font-black">Inviter un utilisateur</h2>
        <form action={inviteFirmUser} className="grid gap-4">
          <div className="field-grid">
            <label>Nom<input name="name" /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>
              Role
              <select name="role" defaultValue={UserRole.ASSISTANT}>
                <option value={UserRole.MANAGER}>Responsable</option>
                <option value={UserRole.ASSISTANT}>Assistant</option>
                <option value={UserRole.READ_ONLY}>Lecture seule</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary w-fit">Créer invitation</button>
        </form>
      </section>

      {user.role === UserRole.OWNER ? (
        <section className="card p-4">
          <h2 className="mb-3 font-black">Transferer la propriete</h2>
          <form action={transferOwnership} className="grid gap-4">
            <input type="hidden" name="firmId" value={user.firmId} />
            <label>
              Nouveau propriétaire
              <select name="targetUserId" required>
                {transferableUsers.map((teamUser) => <option key={teamUser.id} value={teamUser.id}>{teamUser.name} - {teamUser.email} - {roleLabel(teamUser.role)}</option>)}
              </select>
            </label>
            <button className="btn w-fit">Transferer propriétaire</button>
          </form>
        </section>
      ) : null}

      <section className="card min-w-0 overflow-hidden">
        <div className="p-4">
          <h2 className="font-extrabold">Utilisateurs cabinet</h2>
        </div>
        <SearchFilterForm
          searchPlaceholder="Rechercher nom ou email"
          filters={[{ name: "role", label: "Role", value: params.role, options: [
            { value: "", label: "Tous les roles" },
            { value: UserRole.OWNER, label: roleLabel(UserRole.OWNER) },
            { value: UserRole.MANAGER, label: roleLabel(UserRole.MANAGER) },
            { value: UserRole.ASSISTANT, label: roleLabel(UserRole.ASSISTANT) },
            { value: UserRole.READ_ONLY, label: roleLabel(UserRole.READ_ONLY) }
          ] }]}
        />
        <PaginationControls total={totalUsers} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Role</th>
                <th>Etat</th>
                <th>Cree le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((teamUser) => (
                <tr key={teamUser.id}>
                  <td className="font-bold">{teamUser.name}</td>
                  <td>{teamUser.email}</td>
                  <td>
                    <span className="badge border-slate-200 bg-slate-50 text-slate-700">
                      <span className="badge-dot" aria-hidden="true" />
                      {roleLabel(teamUser.role)}
                    </span>
                  </td>
                  <td>
                    <span className={cn("badge", teamUser.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                      <span className="badge-dot" aria-hidden="true" />
                      {teamUser.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td>{formatDate(teamUser.createdAt)}</td>
                  <td>
                    {teamUser.id === user.id || teamUser.role === UserRole.OWNER ? "-" : teamUser.isActive ? (
                      <form action={disableUser.bind(null, teamUser.id)}>
                        <input type="hidden" name="disabledReason" value="Désactivé par le responsable cabinet" />
                        <button className="btn">Désactiver</button>
                      </form>
                    ) : (
                      <form action={enableUser.bind(null, teamUser.id)}>
                        <button className="btn">Réactiver</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title={search || role ? "Aucun utilisateur trouvé" : "Aucun membre d'équipe pour le moment"}
                      description={search || role ? "Essayez un autre nom, email ou rôle." : "Invitez un premier membre de votre équipe avec le formulaire ci-dessus."}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={totalUsers} page={page} limit={limit} searchParams={params} />
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="p-4">
          <h2 className="font-extrabold">Invitations</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Expire le</th>
                <th>Etat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const inviteStatus = invite.acceptedAt
                  ? { label: "Acceptée", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
                  : invite.revokedAt
                    ? { label: "Révoquée", tone: "border-slate-200 bg-slate-50 text-slate-600" }
                    : invite.expiresAt < new Date()
                      ? { label: "Expirée", tone: "border-amber-200 bg-amber-50 text-amber-800" }
                      : { label: "En attente", tone: "border-blue-200 bg-blue-50 text-blue-700" };
                return (
                  <tr key={invite.id}>
                    <td className="font-bold">{invite.email}</td>
                    <td>{roleLabel(invite.role)}</td>
                    <td>{formatDate(invite.expiresAt)}</td>
                    <td>
                      <span className={cn("badge", inviteStatus.tone)}>
                        <span className="badge-dot" aria-hidden="true" />
                        {inviteStatus.label}
                      </span>
                    </td>
                    <td className="flex flex-wrap gap-2">
                      {!invite.acceptedAt && invite.role !== UserRole.OWNER ? (
                        <>
                          <form action={resendInvite.bind(null, invite.id)}><button className="btn">Renvoyer</button></form>
                          {!invite.revokedAt ? <form action={cancelInvite.bind(null, invite.id)}><button className="btn">Annuler</button></form> : null}
                        </>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
              {!invites.length ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="Aucune invitation pour le moment"
                      description="Invitez un premier membre de votre équipe avec le formulaire ci-dessus."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
