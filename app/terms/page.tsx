import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link href="/" className="text-sm font-bold text-primary">TVA Collect</Link>
        <h1 className="text-3xl font-black">Conditions d&apos;utilisation</h1>
        <section className="card p-4 text-sm text-muted">
          <p>
            TVA Collect est un outil de collecte et suivi documentaire pour cabinets comptables. Le cabinet reste responsable de la validation comptable, fiscale et juridique des informations traitees.
          </p>
          <p className="mt-3">
            Les clients doivent transmettre des documents lisibles, complets et lies a la periode indiquee. Les documents tardifs ou incomplets peuvent retarder le traitement du dossier.
          </p>
          <p className="mt-3">
            L&apos;application ne remplace pas le jugement professionnel du cabinet et ne realise pas de declaration fiscale automatiquement.
          </p>
        </section>
      </div>
    </main>
  );
}
