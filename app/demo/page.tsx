import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planifier une demo",
  description: "Planifiez une demonstration de TVA Collect pour votre cabinet comptable."
};

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <section>
          <Link href="/" className="app-shell-brand text-base">
            <span className="app-shell-brand-mark">TVA</span>
            TVA Collect
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Planifier une démo</h1>
          <p className="mt-3 leading-relaxed text-muted">
            Voyez comment passer des documents éparpillés sur WhatsApp à une collecte suivie, relancée et exportable.
          </p>
        </section>
        <section className="card p-6">
          {params.sent ? (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              Demande reçue. Nous confirmons la démo rapidement.
            </p>
          ) : null}
          {params.error ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              Vérifiez les champs obligatoires.
            </p>
          ) : null}
          <form action="/api/contact" method="post" className="grid gap-4">
            <div className="field-grid">
              <label>Nom<input name="name" required /></label>
              <label>Cabinet<input name="firmName" required /></label>
              <label>Téléphone<input name="phone" required /></label>
              <label>Email<input name="email" type="email" required /></label>
              <label>Ville<input name="city" /></label>
              <label>Nombre de clients<input name="numberOfClients" type="number" min="1" /></label>
              <label>Assistants<input name="numberOfAssistants" type="number" min="0" /></label>
              <label>Date souhaitée<input name="preferredDemoDate" type="date" /></label>
              <label>Heure souhaitée<input name="preferredDemoTime" type="time" /></label>
              <label>
                Priorité du problème
                <select name="painLevel" defaultValue="HIGH">
                  <option value="HIGH">Élevé</option>
                  <option value="MEDIUM">Moyen</option>
                  <option value="LOW">Faible</option>
                </select>
              </label>
            </div>
            <label>Organisation actuelle<input name="currentWorkflow" placeholder="WhatsApp, Excel, Drive..." /></label>
            <label>
              Problème principal
              <textarea name="biggestProblem" rows={3} />
            </label>
            <input type="hidden" name="leadSource" value="DEMO_PAGE" />
            <input type="hidden" name="redirectTo" value="/demo" />
            <button className="btn btn-primary w-fit" type="submit">
              Demander la démo
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
