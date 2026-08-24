import { ArrowRight, CheckCircle2, Clock, CreditCard, Download, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs TVA Collect",
  description:
    "Tarifs TVA Collect adaptés aux cabinets comptables marocains. Essai gratuit de 30 jours, sans carte bancaire et sans engagement."
};

const plans = [
  {
    name: "Essentiel",
    code: "STARTER",
    tagline: "Pour démarrer",
    price: "119 MAD",
    note: "/ mois",
    perDay: "environ 4 MAD par jour",
    perClient: "6 MAD",
    description: "Pour un petit cabinet qui veut remplacer WhatsApp et Excel par un suivi simple.",
    limits: ["20 clients", "1 utilisateur", "1 collecte active", "2 Go de stockage"],
    features: ["Portail de dépôt client", "Suivi des documents manquants", "Relances de base", "Export CSV"],
    cta: "Démarrer gratuitement",
    ctaNote: "30 jours gratuits · sans carte bancaire",
    recommended: false
  },
  {
    name: "Professionnel",
    code: "PRO",
    tagline: "Le meilleur rapport valeur / prix",
    price: "249 MAD",
    note: "/ mois",
    perDay: "environ 8 MAD par jour",
    perClient: "3 MAD",
    description: "Le meilleur choix pour un cabinet actif avec assistants, exports et reporting.",
    limits: ["75 clients", "3 utilisateurs", "Collectes actives illimitées", "10 Go de stockage"],
    features: ["Tout Essentiel", "Export ZIP", "Rapports avancés", "Validation des documents", "Support prioritaire"],
    cta: "Démarrer gratuitement",
    ctaNote: "30 jours gratuits · sans carte bancaire",
    recommended: true
  },
  {
    name: "Cabinet Plus",
    code: "PREMIUM",
    tagline: "Pour les cabinets structurés",
    price: "449 MAD",
    note: "/ mois",
    perDay: "environ 15 MAD par jour",
    perClient: "2 MAD",
    description: "Pour les cabinets plus structurés avec plus de volume, marque cabinet et workflows avancés.",
    limits: ["200 clients", "8 utilisateurs", "Collectes actives illimitées", "50 Go de stockage"],
    features: [
      "Tout Professionnel",
      "Portail à la marque du cabinet",
      "Workflow builder",
      "Rapports avancés et preuve",
      "Accompagnement prioritaire"
    ],
    cta: "Parler à TVA Collect",
    ctaNote: "Devis et accompagnement à la mise en place",
    recommended: false
  }
];

const trustPoints = [
  { icon: Clock, label: "30 jours gratuits" },
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: XCircle, label: "Sans engagement" },
  { icon: Download, label: "Vos données restent exportables" }
];

const reassurances = [
  {
    title: "Aucun frais d'installation",
    body: "Le prix affiché est le prix payé. Pas de frais de mise en service, pas de coût caché à l'activation."
  },
  {
    title: "Vous changez de plan quand vous voulez",
    body: "Les limites sont affichées clairement : vous montez de plan seulement quand votre volume l'exige, pas avant."
  },
  {
    title: "Vous partez avec vos données",
    body: "Export CSV inclus dès le plan Essentiel. Vos documents et votre historique vous appartiennent, à tout moment."
  }
];

const comparisons = [
  ["Clients inclus", "20", "75", "200"],
  ["Utilisateurs", "1", "3", "8"],
  ["Collectes actives", "1", "Illimitées", "Illimitées"],
  ["Stockage", "2 Go", "10 Go", "50 Go"],
  ["Coût par client / mois", "6 MAD", "3 MAD", "2 MAD"],
  ["Export CSV", "Oui", "Oui", "Oui"],
  ["Export ZIP", "Non", "Oui", "Oui"],
  ["Rapports avancés", "Non", "Oui", "Oui"],
  ["Portail à la marque du cabinet", "Non", "Non", "Oui"],
  ["Workflow builder", "Non", "Non", "Oui"]
];

const objections = [
  {
    question: "Est-ce que c'est cher pour un petit cabinet ?",
    answer:
      "Le plan Essentiel revient à environ 4 MAD par jour, soit moins de 6 MAD par client et par mois. La vraie comparaison n'est pas « 119 MAD ou rien » : c'est 119 MAD contre les heures passées chaque mois à relancer, chercher et redemander les mêmes pièces."
  },
  {
    question: "Et si le cabinet n'accroche pas ?",
    answer:
      "Vous testez 30 jours gratuitement, sans carte bancaire. Si ça ne vous fait pas gagner de temps sur votre prochaine déclaration, vous ne payez rien et vous n'avez rien à résilier."
  },
  {
    question: "Y a-t-il un engagement de durée ?",
    answer:
      "Non. L'abonnement est mensuel et reste résiliable. Vous n'êtes pas bloqué sur douze mois pour un outil que vous découvrez encore."
  },
  {
    question: "Faut-il payer une mise en place ?",
    answer:
      "Non. Aucun frais d'installation, aucun frais de configuration. Pour les premiers cabinets, la mise en place est même accompagnée gratuitement sur 5 à 10 clients."
  }
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
              Tarifs adaptés au marché marocain
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              À partir de 4 MAD par jour pour ne plus courir après les documents.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Un cabinet passe chaque mois des heures à relancer, chercher et redemander les mêmes pièces. Ce temps-là
              revient tous les mois. TVA Collect coûte moins cher que ces heures — et vous pouvez le vérifier
              gratuitement pendant 30 jours avant de payer quoi que ce soit.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((point) => (
              <div
                key={point.label}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100"
              >
                <point.icon size={16} className="shrink-0 text-teal-300" />
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Choisissez selon votre nombre de clients</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Chaque plan démarre par le même essai gratuit de 30 jours. Vous ne renseignez aucun moyen de paiement pour
              commencer, et vous ne payez qu&apos;une fois convaincu.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <section
                key={plan.code}
                className={`relative flex flex-col rounded-xl border bg-white p-6 ${
                  plan.recommended ? "border-primary shadow-elevated ring-2 ring-primary/15" : "border-border shadow-sm"
                }`}
              >
                {plan.recommended ? (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                    Recommandé
                  </div>
                ) : null}
                <h3 className="pr-28 text-xl font-extrabold">{plan.name}</h3>
                <p className={`mt-1 text-xs font-black uppercase tracking-wide ${plan.recommended ? "text-primary" : "text-muted"}`}>
                  {plan.tagline}
                </p>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-muted">{plan.description}</p>

                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm font-semibold text-muted">{plan.note}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">Soit {plan.perDay}.</p>

                <div className="mt-4 rounded-lg bg-surface px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-muted">Coût par client</span>
                    <span className="text-lg font-extrabold text-primary">{plan.perClient}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">par client suivi et par mois</p>
                </div>

                <Link
                  href={plan.code === "PREMIUM" ? `/contact?plan=${plan.code}` : `/signup?plan=${plan.code}`}
                  className={`btn mt-6 w-full ${plan.recommended ? "btn-primary" : ""}`}
                >
                  {plan.cta}
                  <ArrowRight size={16} />
                </Link>
                <p className="mt-2 text-center text-xs font-semibold text-muted">{plan.ctaNote}</p>

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
                  <div className="text-sm font-black">Fonctionnalités</div>
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

          <p className="mt-5 text-center text-xs font-semibold text-muted">
            Prix mensuels en dirhams. Aucun frais d&apos;installation, aucun frais caché.
          </p>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {reassurances.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-white p-5">
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                  Offre premiers cabinets
                </div>
                <h2 className="mt-3 text-xl font-extrabold">Pilote accompagné, mise en place comprise</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  Nous configurons votre cabinet avec 5 à 10 clients réels et vous l&apos;utilisez sur votre prochaine
                  déclaration TVA. Sans carte bancaire, sans engagement : vous jugez sur une vraie échéance, pas sur une
                  démo.
                </p>
              </div>
              <Link href="/contact" className="btn btn-primary">
                Demander un pilote
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="mt-10 overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-extrabold">Comparer les plans</h2>
              <p className="mt-1 text-sm text-muted">
                Les limites restent lisibles pour éviter les surprises pendant la production.
              </p>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Élément</th>
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

          <section className="mt-10">
            <h2 className="text-xl font-extrabold">Les questions que se posent les cabinets</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {objections.map((item) => (
                <article key={item.question} className="rounded-lg border border-border bg-white p-5">
                  <h3 className="font-extrabold">{item.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-xl border border-border bg-[#07111f] p-8 text-center text-white">
            <h2 className="text-2xl font-extrabold tracking-tight">Testez sur votre prochaine déclaration TVA</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              30 jours gratuits, sans carte bancaire et sans engagement. Si le cabinet ne gagne pas de temps, vous
              n&apos;avez rien à résilier et rien à payer.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/signup?plan=PRO" className="btn btn-primary">
                Démarrer gratuitement
                <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="btn bg-white/10 text-white hover:bg-white/15">
                Parler à quelqu&apos;un d&apos;abord
              </Link>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-400">Accès immédiat · Aucun appel requis</p>
          </section>
        </div>
      </section>
    </main>
  );
}
