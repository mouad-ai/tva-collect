import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelInvite, changeFirmPlan, createOwnerInvite, reactivateFirm, resendInvite, suspendFirm, transferOwnership } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { collectionStatusLabel, firmStatusLabel, planLabel, roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function AdminFirmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const firm = await prisma.firm.findUnique({
    where: { id },
    include: {
      users: true,
      invites: { orderBy: { createdAt: "desc" } },
      clients: { orderBy: { createdAt: "desc" }, take: 8 },
      collectionPeriods: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 8 },
      uploadedDocuments: { select: { size: true } },
      _count: { select: { clients: true, collectionPeriods: true } }
    }
  });
  if (!firm) notFound();
  const storage = firm.uploadedDocuments.reduce((sum, document) => sum + document.size, 0);
  const activeUsers = firm.users.filter((user) => user.isActive && user.role !== "ADMIN");

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">{firm.name}</h1>
        <p className="text-sm text-muted">{firm.city || "Ville non renseignee"} - {planLabel(firm.plan)} - {firmStatusLabel(firm.status)} - créé le {formatDate(firm.createdAt)}</p>
        <Link href={`/admin/firms/${firm.id}/billing`} className="btn btn-compact mt-3">Facturation cabinet</Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <form action={changeFirmPlan.bind(null, firm.id)} className="card grid gap-3 p-4">
          <h2 className="font-black">Plan et statut</h2>
          <label>
            Plan
            <select name="plan" defaultValue={firm.plan}>
              <option value="STARTER">Démarrage</option>
              <option value="PRO">Pro</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
          <label>
            Statut
            <select name="status" defaultValue={firm.status}>
              <option value="TRIAL">Essai</option>
              <option value="ACTIVE">Actif</option>
              <option value="OVERDUE">En retard</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </label>
          <label>Debut essai<input name="trialStartDate" type="date" defaultValue={firm.trialStartDate?.toISOString().slice(0, 10) || ""} /></label>
          <label>Fin essai<input name="trialEndDate" type="date" defaultValue={firm.trialEndDate?.toISOString().slice(0, 10) || ""} /></label>
          <button className="btn">Enregistrer</button>
        </form>
        <form action={suspendFirm.bind(null, firm.id)} className="card grid gap-3 p-4">
          <h2 className="font-black">Suspension</h2>
          <label>Raison<textarea name="suspendedReason" rows={4} defaultValue={firm.suspendedReason || ""} /></label>
          <button className="btn">Suspendre</button>
          {firm.status === "SUSPENDED" || firm.status === "CANCELLED" ? (
            <button formAction={reactivateFirm.bind(null, firm.id)} className="btn btn-primary">Réactiver</button>
          ) : null}
        </form>
        <form action={transferOwnership} className="card grid gap-3 p-4">
          <h2 className="font-black">Transfert propriétaire</h2>
          <input type="hidden" name="firmId" value={firm.id} />
          <label>
            Nouveau propriétaire
            <select name="targetUserId" required>
              {activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email} - {roleLabel(user.role)}</option>)}
            </select>
          </label>
          <button className="btn">Transferer</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4"><div className="text-sm font-bold text-muted">Utilisateurs</div><div className="mt-2 text-3xl font-black">{firm.users.length}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Clients</div><div className="mt-2 text-3xl font-black">{firm._count.clients}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Collectes</div><div className="mt-2 text-3xl font-black">{firm._count.collectionPeriods}</div></div>
        <div className="card p-4"><div className="text-sm font-bold text-muted">Stockage</div><div className="mt-2 text-3xl font-black">{formatBytes(storage)}</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-black">Utilisateurs</h2>
          <div className="grid gap-2 text-sm">
            {firm.users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div><span className="font-bold">{user.name}</span> - {user.email} - {roleLabel(user.role)} - {user.isActive ? "Actif" : "Désactivé"}</div>
                {user.role === "OWNER" ? (
                  <form action={createOwnerInvite.bind(null, firm.id, user.id)}>
                    <button className="btn">Générer lien mot de passe</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-black">Collectes recentes</h2>
          <div className="grid gap-2 text-sm">
            {firm.collectionPeriods.map((collection) => <div key={collection.id} className="rounded-md border border-border p-3"><span className="font-bold">{collection.name}</span> - {collectionStatusLabel(collection.status)}</div>)}
            {!firm.collectionPeriods.length ? <p className="text-muted">Aucune collecte pour ce cabinet.</p> : null}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-black">Invitations</h2>
        <div className="grid gap-2 text-sm">
          {firm.invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <span className="font-bold">{invite.email}</span> - {roleLabel(invite.role)} - {invite.acceptedAt ? "Acceptée" : invite.revokedAt ? "Révoquée" : invite.expiresAt < new Date() ? "Expirée" : "En attente"}
              </div>
              {!invite.acceptedAt ? (
                <div className="flex gap-2">
                  <form action={resendInvite.bind(null, invite.id)}><button className="btn">Renvoyer</button></form>
                  {!invite.revokedAt ? <form action={cancelInvite.bind(null, invite.id)}><button className="btn">Annuler</button></form> : null}
                </div>
              ) : null}
            </div>
          ))}
          {!firm.invites.length ? <p className="text-muted">Aucune invitation pour ce cabinet.</p> : null}
        </div>
      </section>
    </div>
  );
}
