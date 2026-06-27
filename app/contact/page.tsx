import Link from "next/link";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Link href="/" className="text-sm font-bold text-primary">TVA Collect</Link>
          <h1 className="mt-4 text-3xl font-black">Demander un pilote</h1>
          <p className="mt-3 text-muted">
            Testez TVA Collect sur 5 dossiers clients ce mois-ci. Le pilote inclut la configuration,
            les liens de depot, le suivi documents et les modeles de relance.
          </p>
        </div>
        <section className="card p-5">
          {params.sent ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Demande recue. Nous vous recontactons rapidement.</p> : null}
          {params.error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">Verifiez les champs obligatoires.</p> : null}
          <form action="/api/contact" method="post" className="grid gap-4">
            <div className="field-grid">
              <label>Nom<input name="name" required /></label>
              <label>Cabinet<input name="firmName" required /></label>
              <label>Telephone<input name="phone" required /></label>
              <label>Email<input name="email" type="email" required /></label>
              <label>Ville<input name="city" /></label>
              <label>Nombre de clients<input name="numberOfClients" type="number" min="1" /></label>
              <label>Assistants<input name="numberOfAssistants" type="number" min="0" /></label>
              <label>
                Niveau de douleur
                <select name="painLevel" defaultValue="MEDIUM">
                  <option value="HIGH">Eleve</option>
                  <option value="MEDIUM">Moyen</option>
                  <option value="LOW">Faible</option>
                </select>
              </label>
            </div>
            <label>Organisation actuelle<input name="currentWorkflow" placeholder="WhatsApp, Excel, Drive..." /></label>
            <label>Plus gros probleme<textarea name="biggestProblem" rows={3} placeholder="Ex: clients qui envoient tout sur WhatsApp, documents manquants..." /></label>
            <input type="hidden" name="leadSource" value="PILOT_PAGE" />
            <label>Message<textarea name="message" rows={4} /></label>
            <button className="btn btn-primary w-fit">Demander un pilote</button>
          </form>
        </section>
      </div>
    </main>
  );
}
