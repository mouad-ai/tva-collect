import { UserRole } from "@prisma/client";
import { inviteTeamUserAction, revokeInviteAction, setUserActiveAction, transferOwnershipAction } from "@/app/app/settings/team/actions";
import { requireAnyRole, requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeamPage() {
  const user = await requireFirmUser();
  const teamManagers: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];
  const canManage = teamManagers.includes(user.role);
  const [users, invites] = await Promise.all([
    prisma.user.findMany({ where: { firmId: user.firmId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.userInvite.findMany({ where: { firmId: user.firmId, acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "desc" } })
  ]);
  if (!canManage) await requireAnyRole([UserRole.OWNER, UserRole.MANAGER]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Equipe</h1>
        <p className="text-sm text-muted">Invitations, roles et acces utilisateurs du cabinet.</p>
      </div>
      {canManage ? (
        <section className="card p-4">
          <h2 className="mb-4 font-black">Inviter un utilisateur</h2>
          <form action={inviteTeamUserAction} className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
            <label>Nom<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Role<select name="role" defaultValue="ASSISTANT"><option value="MANAGER">Manager</option><option value="ASSISTANT">Assistant</option><option value="READ_ONLY">Lecture seule</option></select></label>
            <button className="btn btn-primary">Inviter</button>
          </form>
        </section>
      ) : null}
      <section className="card overflow-hidden">
        <table>
          <thead><tr><th>Utilisateur</th><th>Role</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.name}</strong><div className="text-xs text-muted">{member.email}</div></td>
                <td>{member.role}</td>
                <td>{member.isActive ? "Actif" : "Inactif"}</td>
                <td className="flex flex-wrap gap-2">
                  {canManage && member.id !== user.id ? (
                    <form action={setUserActiveAction.bind(null, member.id, !member.isActive)}>
                      <button className="btn">{member.isActive ? "Desactiver" : "Activer"}</button>
                    </form>
                  ) : null}
                  {user.role === UserRole.OWNER && member.id !== user.id && member.isActive ? (
                    <form action={transferOwnershipAction.bind(null, member.id)}>
                      <button className="btn">Transferer OWNER</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card overflow-hidden">
        <div className="border-b border-border p-4 font-black">Invitations en attente</div>
        <table>
          <thead><tr><th>Email</th><th>Role</th><th>Expiration</th><th></th></tr></thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{invite.role}</td>
                <td>{invite.expiresAt.toLocaleDateString("fr-MA")}</td>
                <td><form action={revokeInviteAction.bind(null, invite.id)}><button className="btn btn-danger">Revoquer</button></form></td>
              </tr>
            ))}
            {!invites.length ? <tr><td colSpan={4} className="text-muted">Aucune invitation en attente.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
