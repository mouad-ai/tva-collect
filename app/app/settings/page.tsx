import { Landmark, Save, Users } from "lucide-react";
import Link from "next/link";
import { updateSettingsAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { defaultRequiredDocuments } from "@/lib/constants";

function docsToText(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : defaultRequiredDocuments.join("\n");
}

export default async function SettingsPage() {
  const user = await requireFirmUser();

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted">Profil cabinet, documents par défaut et modèle de relance.</p>
      </div>

      <section className="card p-4">
        <div className="mb-4 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-black"><Landmark size={17} /> Configuration fiscale</div>
              <div className="mt-1 text-sm text-muted">Taux TVA, régimes, fréquence et jours d&apos;échéance par défaut.</div>
            </div>
            <Link href="/app/settings/fiscal-config" className="btn">Ouvrir configuration fiscale</Link>
          </div>
        </div>
        <div className="mb-4 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-black"><Users size={17} /> Équipe cabinet</div>
              <div className="mt-1 text-sm text-muted">Inviter responsables, assistants et profils lecture seule.</div>
            </div>
            <Link href="/app/settings/team" className="btn">Gérer équipe</Link>
          </div>
        </div>
        <form action={updateSettingsAction} className="grid gap-4">
          <div className="field-grid">
            <label>Nom cabinet<input name="name" defaultValue={user.firm.name} required /></label>
            <label>Ville<input name="city" defaultValue={user.firm.city || ""} /></label>
            <label>Téléphone<input name="phone" defaultValue={user.firm.phone || ""} /></label>
            <label>Email<input name="email" type="email" defaultValue={user.firm.email || ""} /></label>
            <label>URL logo<input name="logoUrl" defaultValue={user.firm.logoUrl || ""} placeholder="https://..." /></label>
          </div>
          <label>
            Documents requis par défaut
            <textarea name="defaultRequiredDocuments" rows={7} defaultValue={docsToText(user.firm.defaultRequiredDocuments)} />
          </label>
          <label>
            Modèle de relance WhatsApp
            <textarea
              name="reminderTemplate"
              rows={8}
              defaultValue={user.firm.reminderTemplate || "Bonjour [Client],\n\nPetit rappel pour [Workflow] [Mois année].\n\nIl nous manque encore les documents suivants :\n\n[Documents manquants]\n\nMerci de les déposer ici :\n[Lien dépôt]\n\nCabinet [Nom cabinet]"}
            />
          </label>

          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer</button>
        </form>
      </section>
    </div>
  );
}

