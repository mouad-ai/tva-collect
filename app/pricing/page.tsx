import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs TVA Collect",
  description: "Tarifs TVA Collect adaptes aux cabinets comptables marocains: Essentiel, Professionnel et Cabinet Plus."
};

const plans = [
  {
    name: "Essentiel",
    code: "STARTER",
    price: "399 MAD",
    note: "/ mois",
    description: "Pour un petit cabinet qui veut remplacer WhatsApp et Excel par un suivi simple.",
    limits: ["20 clients", "1 utilisateur", "1 collecte active", "2 Go de stockage"],
    features: ["Portail de depot client", "Suivi des documents manquants", "Relances de base", "Export CSV"],
    cta: "Commencer simple",
    recommended: false
  },
  {
    name: "Professionnel",
    code: "PRO",
    price: "799 MAD",
    note: "/ mois",
    description: "Le meilleur choix pour un cabinet actif avec assistants, exports et reporting.",
    limits: ["75 clients", "3 utilisateurs", "Collectes actives illimitees", "10 Go de stockage"],
    features: ["Tout Essentiel", "Export ZIP", "Rapports avances", "Validation des documents", "Priorite support"],
    cta: "Choisir Professionnel",
    recommended: true
  },
  {
    name: "Cabinet Plus",
    code: "PREMIUM",
    price: "1 490 MAD",
    note: "/ mois",
    description: "Pour les cabinets plus structures avec plus de volume, marque cabinet et workflows avances.",
    limits: ["200 clients", "8 utilisateurs", "Collectes actives illimitees", "50 Go de stockage"],
    features: ["Tout Professionnel", "Portail marque cabinet", "Workflow builder", "Rapports avances et preuve", "Accompagnement prioritaire"],
    cta: "Parler a TVA Collect",
    recommended: false
  }
];

const comparisons = [
  ["Clients inclus", "20", "75", "200"],
  ["Utilisateurs", "1", "3", "8"],
  ["Collectes actives", "1", "Illimitees", "Illimitees"],
  ["Stockage", "2 Go", "10 Go", "50 Go"],
  ["Export CSV", "Oui", "Oui", "Oui"],
  ["Export ZIP", "Non", "Oui", "Oui"],
  ["Rapports avances", "Non", "Oui", "Oui"],
  ["Portail marque cabinet", "Non", "Non", "Oui"],
  ["Workflow builder", "Non", "Non", "Oui"]
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="border-b border-border bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex items-center gap-3 text-lg font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black">TVA</span>
            TVA Collect
          </Link>
          <div className="mt-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-100">
              <ShieldCheck size={14} />
              Tarifs adaptes au marche marocain
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              Des tarifs simples pour demarrer sans bloquer le cabinet.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              TVA Collect doit couter moins cher que le temps perdu dans les relances WhatsApp, les fichiers eparpilles
              et les dossiers incomplets. Commencez petit, puis passez au plan superieur quand le volume augmente.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <section
                key={plan.code}
                className={`relative rounded-xl border bg-white p-6 shadow-sm ${plan.recommended ? "border-primary ring-2 ring-primary/15" : "border-border"}`}
              >
                {plan.recommended ? (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                    Recommande
                  </div>
                ) : null}
                <h2 className="pr-28 text-xl font-extrabold">{plan.name}</h2>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-muted">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm font-semibold text-muted">{plan.note}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">Prix mensuel, hors taxes si applicable.</p>
                <Link href={`/contact?plan=${plan.code}`} className={`btn mt-6 w-full ${plan.recommended ? "btn-primary" : ""}`}>
                  {plan.cta}
                </Link>
                <div className="mt-6 border-t border-border pt-5">
                  <div className="text-sm font-black">Limites incluses</div>
                  <ul className="mt-3 grid gap-2 text-sm text-muted">
                    {plan.limits.map((limit) => (
                      <li key={limit} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5">
                  <div className="text-sm font-black">Fonctionnalites</div>
                  <ul className="mt-3 grid gap-2 text-sm text-muted">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <section className="mt-10 rounded-xl border border-border bg-surface p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-xl font-extrabold">Pilote de demarrage</h2>
                <p className="mt-1 text-sm text-muted">
                  Pour les premiers cabinets, vous pouvez proposer un pilote accompagne sur 5 a 10 clients avant abonnement.
                </p>
              </div>
              <Link href="/contact" className="btn btn-primary">
                Demander un pilote
              </Link>
            </div>
          </section>

          <section className="mt-10 overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-extrabold">Comparer les plans</h2>
              <p className="mt-1 text-sm text-muted">Les limites restent lisibles pour eviter les surprises pendant la production.</p>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Essentiel</th>
                    <th>Professionnel</th>
                    <th>Cabinet Plus</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map(([label, starter, pro, premium]) => (
                    <tr key={label}>
                      <td className="font-bold">{label}</td>
                      <td>{starter}</td>
                      <td>{pro}</td>
                      <td>{premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Sans carte obligatoire au depart", "Le pilote peut etre valide par contact commercial avant activation."],
              ["Upgrade simple", "Les limites indiquent clairement quand passer au plan superieur."],
              ["Rentable pour le cabinet", "Le prix reste inferieur au cout cache de plusieurs heures de relance manuelle."]
            ].map(([title, body]) => (
              <article key={title} className="rounded-lg border border-border bg-white p-5">
                <h3 className="font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
