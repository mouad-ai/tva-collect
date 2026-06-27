import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link href="/" className="text-sm font-bold text-primary">TVA Collect</Link>
        <h1 className="text-3xl font-black">Confidentialite</h1>
        <section className="card p-4 text-sm text-muted">
          <p>
            TVA Collect aide les cabinets comptables a collecter les documents de leurs clients. Les fichiers transmis par les clients sont accessibles uniquement au cabinet concerne.
          </p>
          <p className="mt-3">
            Les informations stockees peuvent inclure les coordonnees client, documents uploades, relances, evenements operationnels et preuves de depot.
          </p>
          <p className="mt-3">
            Pour toute demande de suppression ou correction de donnees, contactez votre cabinet comptable ou l&apos;administrateur TVA Collect.
          </p>
        </section>
      </div>
    </main>
  );
}
