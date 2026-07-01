import { requireFirmUser } from "@/lib/auth";

export default async function SuspendedPage() {
  const user = await requireFirmUser({ allowSuspended: true });
  return (
    <div className="card p-6">
      <h1 className="text-2xl font-black">Compte suspendu</h1>
      <p className="mt-2 text-sm text-muted">
        Le cabinet {user.firm.name} est actuellement {user.firm.status.toLowerCase()}. Les fonctions de collecte sont bloquees.
      </p>
      <a href="/app/billing" className="btn btn-primary mt-5">Voir la facturation</a>
    </div>
  );
}
