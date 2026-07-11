import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DatabaseBackup,
  Eye,
  FileArchive,
  FileCheck2,
  FolderKanban,
  Headset,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  PlayCircle,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UploadCloud,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { supportEmail } from "@/lib/constants";
import { appLoginHref } from "@/lib/routing";

const workflow = [
  {
    icon: FolderKanban,
    title: "Créer une collecte",
    body: "Le cabinet choisit la période TVA, ajoute les clients concernés et prépare la liste des documents attendus."
  },
  {
    icon: UploadCloud,
    title: "Envoyer un lien de dépôt",
    body: "Chaque client reçoit son lien par WhatsApp, SMS ou email. Aucun compte à créer, aucune application à installer."
  },
  {
    icon: Eye,
    title: "Suivre ce qui manque",
    body: "Le tableau de bord montre en temps réel qui a déposé, ce qui manque et ce qui reste à vérifier."
  },
  {
    icon: BellRing,
    title: "Relancer et clôturer à temps",
    body: "Relances prêtes à envoyer et dossiers complets avant l'échéance, avec un historique de chaque action."
  }
];

const problems = [
  {
    icon: Inbox,
    title: "Documents éparpillés partout",
    body: "Factures et relevés arrivent sur WhatsApp, par email, sur papier ou dans des dossiers partagés — un endroit différent pour chaque client."
  },
  {
    icon: Send,
    title: "Relances manuelles sans fin",
    body: "Votre équipe relance à la main, sans savoir qui a déjà répondu ni ce qu'il manque vraiment."
  },
  {
    icon: CalendarClock,
    title: "Dossiers incomplets découverts trop tard",
    body: "Vous découvrez les pièces manquantes juste avant l'échéance TVA, quand il n'y a plus le temps de réagir."
  },
  {
    icon: UsersRound,
    title: "Une équipe bloquée sur la relance",
    body: "Vos assistants passent la journée à courir après les documents au lieu de traiter les dossiers — et vous ne pouvez pas prendre plus de clients."
  }
];

const outcomes = [
  {
    icon: CalendarClock,
    title: "Dossiers complets avant l'échéance",
    body: "Les pièces manquantes sont visibles tôt, pas la veille de la déclaration TVA."
  },
  {
    icon: Clock,
    title: "Moins de relances manuelles",
    body: "Les relances sont préparées pour vous ; votre équipe arrête de courir après chaque client."
  },
  {
    icon: Eye,
    title: "Visibilité claire sur ce qui manque",
    body: "Une seule vue montre qui a déposé, ce qui manque et ce qui reste à vérifier."
  },
  {
    icon: MessageSquareText,
    title: "Équipe moins mobilisée",
    body: "Fini de chercher les documents dans WhatsApp et les emails toute la journée."
  },
  {
    icon: TrendingUp,
    title: "Capacité à gérer plus de clients",
    body: "Une collecte qui tient à mesure que votre portefeuille de clients grandit."
  }
];

const audiences = [
  {
    icon: UsersRound,
    title: "Pour le propriétaire du cabinet",
    body: "Voir en un coup d'œil les collectes en retard, les clients à relancer et les dossiers prêts — sans ouvrir WhatsApp."
  },
  {
    icon: ClipboardCheck,
    title: "Pour les assistants",
    body: "Savoir quoi faire aujourd'hui sans chercher dans les conversations, les emails ou les dossiers partagés."
  },
  {
    icon: LockKeyhole,
    title: "Pour vos clients",
    body: "Déposer les pièces demandées depuis leur téléphone, sans créer de compte, avec un message de confiance signé du cabinet."
  }
];

const featureGrid = [
  { icon: LayoutDashboard, label: "Tableau de bord des collectes actives" },
  { icon: Smartphone, label: "Portail de dépôt mobile pour les clients" },
  { icon: ListChecks, label: "Suivi des documents manquants" },
  { icon: Send, label: "Relances prêtes à envoyer (WhatsApp, email)" },
  { icon: FileCheck2, label: "Validation et rejet des fichiers" },
  { icon: FileArchive, label: "Exports CSV et archives propres" },
  { icon: UsersRound, label: "Rôles propriétaire, manager, assistant, lecture seule" },
  { icon: ClipboardList, label: "Journal d'audit des actions importantes" }
];

const trustItems = [
  {
    icon: LockKeyhole,
    title: "Accès par lien sécurisé",
    body: "Vos clients déposent via un lien unique et personnel, sans créer de compte ni mot de passe."
  },
  {
    icon: Building2,
    title: "Données cloisonnées par cabinet",
    body: "Chaque cabinet voit uniquement ses propres clients et documents. Aucun accès croisé entre cabinets."
  },
  {
    icon: ClipboardList,
    title: "Historique des actions",
    body: "Chaque dépôt, validation, rejet et relance est horodaté pour garder une preuve d'action."
  },
  {
    icon: Server,
    title: "Stockage centralisé",
    body: "Tous les documents d'un client au même endroit, prêts à vérifier et à exporter proprement."
  },
  {
    icon: DatabaseBackup,
    title: "Sauvegardes documentées",
    body: "Une procédure de sauvegarde et de restauration des données est documentée dans le déploiement."
  },
  {
    icon: Headset,
    title: "Support local",
    body: "Une équipe joignable en français par email pour la mise en place et vos questions."
  }
];

const pilotBenefits = [
  "Essai gratuit 30 jours",
  "Sans carte bancaire",
  "Configuration accompagnée",
  "Test sur 5 à 10 clients réels",
  "Offre réservée aux premiers cabinets pilotes"
];

const pricingPlans = [
  {
    name: "Essentiel",
    code: "STARTER",
    price: "399 MAD",
    note: "/ mois",
    description: "Pour un petit cabinet qui veut centraliser la collecte et arrêter les relances dispersées.",
    highlights: ["20 clients", "1 utilisateur", "Portail de dépôt client", "Export CSV"],
    cta: "Commencer simple",
    recommended: false
  },
  {
    name: "Professionnel",
    code: "PRO",
    price: "799 MAD",
    note: "/ mois",
    description: "Le meilleur choix pour un cabinet actif avec assistants, exports et suivi avancé.",
    highlights: ["75 clients", "3 utilisateurs", "Export ZIP et rapports avancés", "Support prioritaire"],
    cta: "Choisir Professionnel",
    recommended: true
  },
  {
    name: "Cabinet Plus",
    code: "PREMIUM",
    price: "1 490 MAD",
    note: "/ mois",
    description: "Pour les cabinets structurés avec plus de volume, marque cabinet et workflows avancés.",
    highlights: ["200 clients", "8 utilisateurs", "Portail marque cabinet", "Accompagnement prioritaire"],
    cta: "Parler à TVA Collect",
    recommended: false
  }
];

const faqs = [
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non. Chaque client reçoit un lien de dépôt sécurisé et personnel. Il dépose ses documents depuis son téléphone ou son ordinateur, sans mot de passe ni inscription."
  },
  {
    question: "Peut-on continuer à utiliser WhatsApp ?",
    answer:
      "Oui. Gardez WhatsApp pour prévenir vos clients — TVA Collect prépare même le message de relance. Ce que vous arrêtez, c'est de recevoir les documents éparpillés dans des dizaines de conversations : tout arrive au même endroit."
  },
  {
    question: "Où sont stockés les documents déposés ?",
    answer:
      "Les documents sont stockés dans un espace de stockage à accès restreint. Chaque cabinet est cloisonné : les données d'un cabinet ne sont jamais visibles par un autre. Voir la page Données et sécurité pour le détail."
  },
  {
    question: "Comment se passe le pilote ?",
    answer:
      "Nous configurons votre cabinet avec 5 à 10 clients, gratuitement, et vous l'utilisez pour la prochaine déclaration TVA. Sans carte bancaire et sans engagement."
  },
  {
    question: "Que se passe-t-il si un client ne dépose rien ?",
    answer:
      "Le tableau de bord signale immédiatement les documents manquants. Des relances prêtes à envoyer (WhatsApp, email) sont préparées, avec un historique des relances déjà envoyées."
  },
  {
    question: "TVA Collect convient-il à un petit cabinet ?",
    answer:
      "Oui. Le plan Essentiel est conçu pour un petit cabinet dès 20 clients et 1 utilisateur, sans engagement de longue durée."
  }
];

export default function LandingPage() {
  const loginHref = appLoginHref();
  return (
    <main className="bg-white text-ink">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-extrabold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-white">
              TVA
            </span>
            TVA Collect
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex" aria-label="Navigation publique">
            <a href="#probleme" className="hover:text-white">Le problème</a>
            <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
            <a href="#securite" className="hover:text-white">Sécurité</a>
            <a href="#tarifs" className="hover:text-white">Tarifs</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block">
              <Link href={loginHref} className="btn border-white/20 bg-white/5 text-white hover:bg-white/10">
                Connexion
              </Link>
            </span>
            <Link href="/demo" className="btn btn-primary">
              Réserver une démo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.24),transparent_42%)]" aria-hidden />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-100">
              <ShieldCheck size={14} />
              SaaS pour cabinets comptables marocains
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-[3.25rem]">
              Ne courez plus après les documents de vos clients avant chaque échéance TVA.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              Un lien de dépôt par client, des relances simples, et une vue claire de ce qui manque —
              pour que vos dossiers soient complets avant la date limite, sans mobiliser votre équipe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="btn btn-primary px-5">
                Réserver une démo de 15 min <ArrowRight size={16} />
              </Link>
              <a href="#fonctionnement" className="btn border-white/20 bg-white text-ink hover:bg-slate-100">
                Voir comment ça marche
              </a>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Essai gratuit 30 jours &middot; Sans carte bancaire &middot; Configuration accompagnée
            </p>
            <dl className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                ["1 lien", "par client"],
                ["0 compte", "côté client"],
                ["1 vue", "des blocages"]
              ].map(([value, label]) => (
                <div key={value} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <dt className="text-xl font-extrabold">{value}</dt>
                  <dd className="mt-0.5 text-sm text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="hidden items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-popover md:absolute md:-left-6 md:-top-6 md:z-20 md:flex">
              <span className="flex items-center gap-1 text-emerald-600">
                <MessageSquareText size={14} /> WhatsApp pour le rappel
              </span>
              <ArrowRight size={12} className="text-muted" />
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 size={14} /> TVA Collect pour les documents
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white text-ink shadow-2xl shadow-black/40">
              <div className="flex items-center gap-1.5 border-b border-border px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
                <span className="ml-3 truncate text-xs font-semibold text-muted">app.tvacollect.com/collectes/juin-2026</span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <div className="text-sm font-extrabold">Collecte TVA - Juin 2026</div>
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
                    ["Café Central", "Factures reçues - à vérifier", "À vérifier", "bg-amber-50 text-amber-800"],
                    ["Pharma Nord", "Dossier complet", "Prêt", "bg-emerald-50 text-emerald-700"]
                  ].map(([client, issue, status, badgeClass]) => (
                    <li key={client} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{client}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">{issue}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>{status}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">
                  <BellRing size={16} className="mt-0.5 shrink-0" />
                  <span>8 clients à relancer avant l&apos;échéance de déclaration.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-xs font-bold uppercase tracking-wide text-muted">
          <span className="flex items-center gap-2"><Building2 size={14} /> Cabinets comptables</span>
          <span className="flex items-center gap-2"><UsersRound size={14} /> Fiduciaires</span>
          <span className="flex items-center gap-2"><ClipboardCheck size={14} /> Experts-comptables</span>
          <span className="flex items-center gap-2"><ShieldCheck size={14} /> Données cloisonnées par cabinet</span>
        </div>
      </section>

      <section id="probleme" className="scroll-mt-24 border-b border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Le problème</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Chaque mois, la collecte des documents TVA se joue à la dernière minute.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Sans outil dédié, chaque collecte repose sur la mémoire de vos assistants et sur des dizaines
              de conversations éparpillées. Le risque monte à chaque échéance — et c&apos;est du temps facturable perdu.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-xl border border-border bg-white p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Ce que vous obtenez</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Des dossiers complets à temps, sans mobiliser votre équipe.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              TVA Collect ne remplace pas votre façon de travailler : il enlève la partie pénible — courir
              après les documents — pour que votre équipe se concentre sur les dossiers.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outcomes.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-xl border border-border bg-white p-5 shadow-card">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="scroll-mt-24 border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Comment ça marche</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Quatre étapes, de la demande au dossier complet.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Créer la collecte, envoyer les liens, suivre ce qui manque, relancer et clôturer à temps.
              Rien à installer côté client.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative overflow-hidden rounded-xl border border-border bg-white p-5">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-1 -top-3 select-none text-6xl font-black text-slate-100"
                  >
                    0{index + 1}
                  </span>
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <Icon size={20} />
                  </span>
                  <h3 className="relative z-10 mt-5 font-extrabold">{step.title}</h3>
                  <p className="relative z-10 mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                <MessageSquareText size={14} />
                Vous gardez WhatsApp
              </div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">
                Gardez WhatsApp pour le rappel. Arrêtez de recevoir les documents dans 40 conversations.
              </h2>
              <p className="mt-4 leading-7 text-muted">
                TVA Collect ne vous demande pas d&apos;abandonner WhatsApp. Continuez à prévenir vos clients par
                le canal qu&apos;ils utilisent déjà — le message de relance est même préparé pour vous. Ce qui change :
                les documents n&apos;arrivent plus éparpillés dans les discussions, mais au même endroit, rattachés
                au bon client et à la bonne période.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["Le rappel part par WhatsApp", "Message de relance prêt à copier, avec la liste des pièces manquantes."],
                ["Le client dépose via son lien", "Un lien unique, sans compte ni application à installer."],
                ["Le document arrive au bon endroit", "Rattaché au client et à la période, prêt à vérifier et exporter."]
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <div className="font-bold">{title}</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Le produit</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                Tout ce qu&apos;il faut pour piloter une collecte TVA.
              </h2>
              <p className="mt-4 leading-7 text-muted">
                Les clients incomplets, les fichiers à vérifier, les relances et les dossiers prêts sont
                visibles dans l&apos;espace cabinet. Vos assistants n&apos;ont pas besoin de deviner.
              </p>
              <div className="mt-6 grid gap-3">
                {audiences.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="flex items-start gap-4 rounded-lg border border-border bg-white p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary">
                        <Icon size={19} />
                      </span>
                      <div>
                        <h3 className="font-extrabold">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featureGrid.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.label} className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary">
                      <Icon size={19} />
                    </span>
                    <span className="text-sm font-bold leading-snug">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Démonstration</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Voyez TVA Collect en action en 90 secondes.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted">
              Découvrez ce que voit votre client au dépôt, et ce que voit votre cabinet dans le tableau de bord.
            </p>
          </div>
          <div className="mt-10 flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-surface text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-card">
              <PlayCircle size={34} />
            </span>
            <div>
              <div className="text-lg font-extrabold">Vidéo de démonstration bientôt disponible</div>
              <p className="mt-1 text-sm text-muted">En attendant, réservez une démo en direct de 15 minutes.</p>
            </div>
            <Link href="/demo" className="btn btn-primary">
              Réserver une démo de 15 min <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section id="securite" className="scroll-mt-24 border-y border-border bg-[#07111f] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-teal-300">Données et sécurité</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Vous gérez des documents financiers. Nous prenons ça au sérieux.
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              Les clients déposent via un lien, sans compte. Le cabinet garde le contrôle des utilisateurs,
              des rôles, des fichiers et de l&apos;historique — et chaque cabinet reste strictement isolé des autres.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 font-extrabold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-5">
            <p className="text-sm font-semibold text-slate-300">
              Vous voulez le détail : stockage, accès, suppression des données ?
            </p>
            <Link href="/securite" className="btn border-white/20 bg-white text-ink hover:bg-slate-100">
              Lire la page Données et sécurité <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section id="pilote" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 rounded-2xl border border-primary/20 bg-teal-50/60 p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Offre pilote</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                Testez sur vos propres clients, avant de décider.
              </h2>
              <p className="mt-4 leading-7 text-muted">
                Nous configurons votre cabinet avec quelques clients réels et vous l&apos;utilisez pour la prochaine
                déclaration TVA. Vous jugez sur pièces, sans risque.
              </p>
              <ul className="mt-6 grid gap-2.5">
                {pilotBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-semibold">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-white p-6 shadow-elevated">
              <div className="text-lg font-extrabold">Demander un accès pilote</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Dites-nous combien de clients vous gérez et votre organisation actuelle. Nous revenons vers vous
                rapidement pour caler la mise en place.
              </p>
              <Link href="/contact" className="btn btn-primary mt-5 w-full">
                Demander un accès pilote <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="btn mt-3 w-full">
                Ou réserver une démo de 15 min
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs" className="scroll-mt-24 border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Tarifs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Des tarifs simples, adaptés au marché marocain.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Commencez petit, puis passez au plan supérieur quand le nombre de clients augmente.
              Chaque plan démarre par un essai gratuit de 30 jours, sans carte bancaire.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.code}
                className={`relative rounded-xl border bg-white p-6 ${plan.recommended ? "border-primary shadow-elevated ring-2 ring-primary/15" : "border-border shadow-card"}`}
              >
                {plan.recommended ? (
                  <div className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                    Recommandé
                  </div>
                ) : null}
                <h3 className="pr-24 text-xl font-extrabold">{plan.name}</h3>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-muted">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm font-semibold text-muted">{plan.note}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-primary">Essai gratuit 30 jours, sans carte.</p>
                <ul className="mt-6 grid gap-2 border-t border-border pt-5 text-sm text-muted">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/contact?plan=${plan.code}`} className={`btn mt-6 w-full ${plan.recommended ? "btn-primary" : ""}`}>
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white px-6 py-5">
            <p className="text-sm font-semibold text-muted">
              Besoin de voir toutes les limites plan par plan ?
            </p>
            <Link href="/pricing" className="btn">
              Comparer les plans en détail <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07111f] py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(20,184,166,0.18),transparent_45%)]" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-200">
              <CalendarClock size={16} />
              Avant la prochaine échéance
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
              Arrêtez de courir après les documents ce mois-ci.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Réservez une démo de 15 minutes, ou demandez un accès pilote et testez la collecte
              sur vos propres clients avant la prochaine déclaration TVA.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
            <Link href="/demo" className="btn btn-primary">
              Réserver une démo de 15 min <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn border-white/20 bg-white/5 text-white hover:bg-white/10">
              Demander un accès pilote
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Questions fréquentes</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Ce que les cabinets nous demandent le plus.
            </h2>
          </div>
          <div className="mt-10 grid gap-3">
            {faqs.map((item) => (
              <details key={item.question} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">
                  {item.question}
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#07111f] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-3 text-lg font-extrabold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-white">
                TVA
              </span>
              TVA Collect
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              Collecte de documents TVA pour cabinets comptables, fiduciaires et experts-comptables marocains.
            </p>
            <a href={`mailto:${supportEmail}`} className="mt-3 inline-block text-sm font-semibold text-teal-300">
              {supportEmail}
            </a>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Informations légales (raison sociale, ICE, RC) à compléter après immatriculation.
            </p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Produit</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Produit">
              <a href="#probleme" className="hover:text-white">Le problème</a>
              <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
              <Link href="/pricing" className="hover:text-white">Tarifs</Link>
            </nav>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Cabinet</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Cabinet">
              <Link href="/demo" className="hover:text-white">Réserver une démo</Link>
              <Link href="/contact" className="hover:text-white">Demander un accès pilote</Link>
              <Link href={loginHref} className="hover:text-white">Connexion</Link>
            </nav>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Confiance</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Confiance et légal">
              <Link href="/securite" className="hover:text-white">Données et sécurité</Link>
              <Link href="/privacy" className="hover:text-white">Confidentialité</Link>
              <Link href="/terms" className="hover:text-white">Conditions</Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs font-medium text-slate-500">
            &copy; {new Date().getFullYear()} TVA Collect. Conçu pour les cabinets comptables au Maroc.
          </div>
        </div>
      </footer>
    </main>
  );
}
