import { Save } from "lucide-react";
import { updateSettingsAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { defaultRequiredDocuments } from "@/lib/constants";

function docsToText(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : defaultRequiredDocuments.join("\n");
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Parametres</h1>
        <p className="text-sm text-muted">Profil cabinet, documents par defaut et modele de relance.</p>
      </div>

      <section className="card p-4">
        <form action={updateSettingsAction} className="grid gap-4">
          <div className="field-grid">
            <label>Nom cabinet<input name="name" defaultValue={user.firm.name} required /></label>
            <label>Ville<input name="city" defaultValue={user.firm.city || ""} /></label>
            <label>Telephone<input name="phone" defaultValue={user.firm.phone || ""} /></label>
            <label>Email<input name="email" type="email" defaultValue={user.firm.email || ""} /></label>
          </div>
          <label>
            Documents requis par defaut
            <textarea name="defaultRequiredDocuments" rows={7} defaultValue={docsToText(user.firm.defaultRequiredDocuments)} />
          </label>
          <label>
            Modele de relance
            <textarea
              name="reminderTemplate"
              rows={8}
              defaultValue={user.firm.reminderTemplate || "Bonjour [Client],\n\nPetit rappel pour la TVA [Month Year].\n\nIl nous manque encore les documents suivants :\n\n[Missing documents]\n\nMerci de les deposer ici :\n[Upload Link]\n\nCabinet [Firm Name]"}
            />
          </label>
          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer</button>
        </form>
      </section>
    </div>
  );
}
