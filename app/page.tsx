import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="bg-white">
      <section
        className="relative min-h-[78vh] bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/office-document-workflow.png')" }}
      >
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4 py-16">
          <div className="max-w-3xl">
            <div className="text-sm font-black uppercase tracking-wide text-teal-200">TVA Collect</div>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              Arretez de courir derriere les factures TVA sur WhatsApp.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-100">
              TVA Collect aide les cabinets comptables a collecter les pieces mensuelles de leurs clients,
              suivre les documents manquants et preparer un dossier propre avant la cloture.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn btn-primary">Tester sur 5 dossiers ce mois</Link>
              <a href="#fonctionnement" className="btn">Voir comment ca marche</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-black">Chaque mois, c&apos;est le meme chaos.</h2>
            <p className="mt-3 text-muted">TVA Collect centralise tout dans un lien simple par client.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Factures envoyees sur WhatsApp", "Photos floues", "Emails perdus", "Clients en retard", "Documents manquants", "Relances a la main"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-white p-3 text-sm font-bold">
                <CheckCircle2 size={17} className="text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-black">Comment ca marche</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {["Creez une collecte TVA mensuelle", "Ajoutez vos clients", "Envoyez un lien de depot", "Les clients deposent leurs documents", "Vous suivez les dossiers complets"].map((step, index) => (
              <div key={step} className="border-l-4 border-primary bg-surface p-4">
                <div className="text-sm font-black text-primary">0{index + 1}</div>
                <div className="mt-2 text-sm font-bold">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl font-black">Pilote cabinet</h2>
            <p className="mt-3 text-muted">Testez TVA Collect sur 5 dossiers clients ce mois-ci.</p>
            <ul className="mt-5 grid gap-2 text-sm font-bold">
              <li>Configuration cabinet</li>
              <li>5 clients</li>
              <li>Liens de depot</li>
              <li>Suivi documents</li>
              <li>Modeles de relance</li>
              <li>Assistance manuelle pendant le pilote</li>
            </ul>
          </div>
          <div className="card p-5">
            <div className="text-sm font-bold text-muted">Prix pilote</div>
            <div className="mt-2 text-4xl font-black">1 000 MAD</div>
            <Link href="/contact" className="btn btn-primary mt-5 w-full">Demander un pilote <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
        <span>TVA Collect</span>
        <div className="flex gap-4">
          <Link href="/pricing">Tarifs</Link>
          <Link href="/login">Connexion</Link>
        </div>
      </footer>
    </main>
  );
}
