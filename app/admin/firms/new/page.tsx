import Link from "next/link";
import { createFirmWithOwner } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  missing: "Nom cabinet, nom propriétaire et email propriétaire sont obligatoires.",
  "owner-email-exists": "Cet email propriétaire existe déjà."
};

export const metadata = { title: "Nouveau cabinet" };

export default async function NewAdminFirmPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Nouveau cabinet</h1>
          <p className="text-sm text-muted">Création SaaS du cabinet et de son premier propriétaire.</p>
        </div>
        <Link href="/admin/firms" className="btn">Retour cabinets</Link>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessages[error] || "Impossible de créer le cabinet."}</div> : null}

      <section className="card p-4">
        <form action={createFirmWithOwner} className="grid gap-4">
          <div className="field-grid">
            <label>Nom cabinet<input name="name" required /></label>
            <label>Ville<input name="city" /></label>
            <label>Téléphone<input name="phone" /></label>
            <label>Email cabinet<input name="email" type="email" /></label>
            <label>
              Plan
              <select name="plan" defaultValue="STARTER">
                <option value="STARTER">Démarrage</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </label>
            <label>
              Statut cabinet
              <select name="status" defaultValue="TRIAL">
                <option value="TRIAL">Essai</option>
                <option value="ACTIVE">Actif</option>
                <option value="OVERDUE">En retard</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </label>
            <label>Début essai<input name="trialStartDate" type="date" /></label>
            <label>Fin essai<input name="trialEndDate" type="date" /></label>
            <label>Nom propriétaire<input name="ownerName" required /></label>
            <label>Email propriétaire<input name="ownerEmail" type="email" required /></label>
          </div>
          <button className="btn btn-primary w-fit">Créer cabinet + propriétaire</button>
        </form>
      </section>
    </div>
  );
}
