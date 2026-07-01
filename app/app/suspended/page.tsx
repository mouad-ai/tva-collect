import Link from "next/link";
import { requireFirmUser } from "@/lib/auth";

export default async function SuspendedFirmPage() {
  const user = await requireFirmUser();
  const suspended = user.firm.status === "SUSPENDED";
  const cancelled = user.firm.status === "CANCELLED";

  return (
    <div className="content-stack">
      <section className="card p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Acces cabinet limite</h1>
        <p className="mt-2 text-sm text-muted">
          {suspended
            ? "Ce cabinet est suspendu. Les pages opérationnelles et les dépôts clients sont temporairement bloques."
            : cancelled
              ? "Ce cabinet est annule. Les pages opérationnelles et les dépôts clients sont bloques."
              : "Votre cabinet est actif."}
        </p>
        {user.firm.suspendedReason ? <p className="mt-3 rounded-md border border-border p-3 text-sm">{user.firm.suspendedReason}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/billing" className="btn btn-primary">Ouvrir facturation</Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn">Déconnexion</button>
          </form>
        </div>
      </section>
    </div>
  );
}
