import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound
} from "lucide-react";
import Link from "next/link";

const painPoints = [
  "Les factures arrivent sur WhatsApp, par email, en papier — personne ne sait où chercher.",
  "Impossible de voir d'un coup d'œil qui bloque la déclaration du mois.",
  "Les relances partent sans trace : qui a été contacté, quand, pour quoi ?",
  "Vos assistants perdent des heures à renommer, trier et relancer à la main."
];

const workflow = [
  {
    icon: UsersRound,
    title: "Ouvrir la collecte",
    body: "Choisissez la période TVA, ajoutez les clients concernés. Chaque dossier a sa fiche."
  },
  {
    icon: UploadCloud,
    title: "Envoyer le lien",
    body: "Le client dépose ses pièces via un lien sécurisé. Pas de compte à créer, pas de formation."
  },
  {
    icon: FileCheck2,
    title: "Contrôler les pièces",
    body: "Fichiers reçus, statuts, périodes et documents manquants — tout au même endroit."
  },
  {
    icon: MessageSquareText,
    title: "Relancer proprement",
    body: "Message prêt à copier, historique conservé. Fini les relances dans le vide."
  }
];

const productAreas = [
  {
    icon: Search,
    title: "Ce qui manque",
    body: "Clients incomplets, pièces invalides, dossiers en retard — visible en un coup d'œil."
  },
  {
    icon: BellRing,
    title: "Qui relancer",
    body: "Listes de relance, messages pré-rédigés, alertes quand un client a déjà été sollicité."
  },
  {
    icon: ShieldCheck,
    title: "Ce qui est prouvé",
    body: "Historique des liens, dépôts, validations, rejets et exports — traçabilité cabinet."
  },
  {
    icon: FileText,
    title: "Prêt pour la déclaration",
    body: "Exports CSV, readiness TVA et dossiers propres avant validation finale."
  }
];

const trustItems = [
  "Comptes cabinet séparés des clients",
  "Rôles propriétaire, manager, assistant et lecture seule",
  "Liens de dépôt sans création de compte client",
  "Fichiers protégés et rattachés à votre cabinet",
  "Journal des actions importantes",
  "Déploiement Docker, PostgreSQL et stockage privé"
];

const pilotItems = [
  "Configuration de votre cabinet",
  "Import ou création de 5 clients",
  "Première collecte TVA",
  "Liens de dépôt publics",
  "Modèles de relance prêts à l'emploi",
  "Export CSV et contrôle des pièces"
];

export default function LandingPage() {
  return (
    <main className="bg-white text-ink">
      <section className="relative min-h-[92vh] overflow-hidden bg-[#07111f] text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(15,118,110,0.35),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }}
          aria-hidden
        />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-white">
                TVA
              </span>
              TVA Collect
            </Link>
            <nav
              className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex"
              aria-label="Navigation principale"
            >
              <a href="#probleme" className="transition hover:text-white">
                Problème
              </a>
              <a href="#fonctionnement" className="transition hover:text-white">
                Comment ça marche
              </a>
              <a href="#contrôle" className="transition hover:text-white">
                Fonctionnalités
              </a>
              <Link href="/pricing" className="transition hover:text-white">
                Tarifs
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="btn hidden border-white/20 bg-white/5 text-white hover:bg-white/10 sm:inline-flex"
              >
                Connexion
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Demander un pilote
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(92vh-74px)] max-w-7xl gap-12 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-200">
              <ShieldCheck size={14} />
              Cabinets comptables & fiduciaires — Maroc
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-[3.25rem]">
              Arrêtez de courir après les pièces TVA.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              Un lien par client pour déposer les documents. Un tableau de bord pour savoir qui manque quoi,
              qui relancer, et quel dossier est prêt — avant l&apos;échéance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn btn-primary px-5">
                Tester avec 5 clients <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="btn border-white/20 bg-white text-ink hover:bg-slate-100">
                Voir la démo
              </Link>
            </div>
            <dl className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                ["1 lien", "par dossier client"],
                ["0 compte", "côté client"],
                ["1 vue", "des retards"]
              ].map(([value, label]) => (
                <div key={value} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <dt className="text-xl font-extrabold">{value}</dt>
                  <dd className="mt-0.5 text-sm text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-white/10 bg-white p-5 text-ink shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-sm font-extrabold">Collecte TVA — Juin 2026</div>
                <div className="mt-0.5 text-xs font-medium text-muted">Espace cabinet</div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Active</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Clients", "42"],
                ["Complets", "29"],
                ["À relancer", "8"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-surface px-3 py-3">
                  <div className="text-xs font-semibold text-muted">{label}</div>
                  <div className="mt-1 text-2xl font-extrabold">{value}</div>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {[
                ["Garage Atlas", "Relevé bancaire manquant", "Urgent", "bg-red-50 text-red-700"],
                ["Café Central", "Factures reçues — à vérifier", "À vérifier", "bg-amber-50 text-amber-800"],
                ["Pharma Nord", "Dossier complet", "Prêt", "bg-emerald-50 text-emerald-700"]
              ].map(([client, issue, status, badgeClass]) => (
                <li
                  key={client}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold">{client}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">{issue}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>{status}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">
              <Clock3 size={16} className="mt-0.5 shrink-0" />
              <span>8 clients à relancer avant l&apos;échéance de déclaration.</span>
            </div>
          </div>
        </div>
      </section>

      <section id="probleme" className="border-b border-border bg-surface py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Le problème</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Ce n&apos;est pas un problème de stockage. C&apos;est un problème de visibilité.
            </h2>
            <p className="mt-4 max-w-lg leading-7 text-muted">
              Quand les pièces arrivent par quatre canaux différents, la vraie question n&apos;est pas
              «&nbsp;où les mettre&nbsp;?&nbsp;» — c&apos;est&nbsp;: qui a envoyé quoi, qu&apos;est-ce qui manque,
              et quelle preuve garde le cabinet ?
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {painPoints.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 text-sm font-medium leading-relaxed">
                <BellRing size={18} className="mt-0.5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="fonctionnement" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Comment ça marche</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Quatre étapes. Compris par le cabinet et par le client.
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-xl border border-border bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary">
                      <Icon size={20} />
                    </span>
                    <span className="text-sm font-bold text-slate-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="contrôle" className="border-y border-border bg-surface py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Contrôle opérationnel</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Chaque matin, votre équipe sait quoi faire.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Pas un simple dossier partagé — une liste de travail&nbsp;: relances à envoyer, pièces à
              vérifier, dossiers prêts, preuves à conserver.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo" className="btn btn-primary">
                Voir la démo
              </Link>
              <Link href="/pricing" className="btn">
                Tarifs
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {productAreas.map((area) => {
              const Icon = area.icon;
              return (
                <article key={area.title} className="rounded-xl border border-border bg-white p-5">
                  <Icon size={22} className="text-primary" />
                  <h3 className="mt-4 font-extrabold">{area.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{area.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_0.95fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Sécurité</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Conçu pour de vrais dossiers clients.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Vos clients n&apos;ont pas de compte. Vous gardez la main sur les utilisateurs, les liens,
              les fichiers et l&apos;historique.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium">
                  <CheckCircle2 size={17} className="shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <aside className="rounded-xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex items-center gap-3 text-[#0f3460]">
              <LockKeyhole size={22} />
              <h3 className="text-xl font-extrabold">Portail client simple</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#183b66]">
              Le client ouvre le lien, voit les documents demandés, dépose ses fichiers et reçoit une
              confirmation. Vous conservez l&apos;historique complet.
            </p>
            <Link href="/contact" className="btn mt-5 bg-white">
              Demander un pilote <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0f3460] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-200">Pilote cabinet</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Testez sur 5 dossiers clients ce mois-ci.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-blue-100">
              Validez le vrai usage&nbsp;: créer une collecte, envoyer les liens, recevoir les documents,
              contrôler les pièces et exporter proprement.
            </p>
            <ul className="mt-6 grid gap-2 text-sm font-medium sm:grid-cols-2">
              {pilotItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-teal-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/15 bg-white p-6 text-ink">
            <p className="text-sm font-semibold text-muted">Prix pilote</p>
            <p className="mt-2 text-4xl font-extrabold">1 000 MAD</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Paiement manuel. Pas de carte bancaire, pas d&apos;engagement long — juste un test contrôlé.
            </p>
            <Link href="/contact" className="btn btn-primary mt-5 w-full">
              Demander un pilote <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="btn mt-3 w-full">
              <PhoneCall size={16} /> Planifier une démo
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted">
        <div>
          <div className="font-extrabold text-ink">TVA Collect</div>
          <p className="mt-1">Collecte et suivi TVA pour cabinets comptables marocains.</p>
        </div>
        <nav className="flex flex-wrap gap-4 font-semibold" aria-label="Pied de page">
          <Link href="/pricing">Tarifs</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/terms">Conditions</Link>
          <Link href="/login">Connexion</Link>
        </nav>
      </footer>
    </main>
  );
}
