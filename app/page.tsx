import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileArchive,
  FileCheck2,
  FileWarning,
  FolderKanban,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Send,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { supportEmail } from "@/lib/constants";
import { appLoginHref } from "@/lib/routing";

const workflow = [
  {
    icon: FolderKanban,
    title: "Creer une collecte",
    body: "Le cabinet choisit la periode TVA, ajoute les clients concernes et prepare la liste des documents attendus."
  },
  {
    icon: UploadCloud,
    title: "Envoyer un lien client",
    body: "Chaque client recoit un lien de depot securise par SMS, email ou WhatsApp. Aucun compte client n'est necessaire."
  },
  {
    icon: FileCheck2,
    title: "Verifier les pieces",
    body: "L'assistant voit en un coup d'oeil les documents recus, manquants, invalides et prets a traiter."
  },
  {
    icon: MessageSquareText,
    title: "Relancer proprement",
    body: "Les relances sont pretes a copier, avec historique complet et preuve d'action a l'appui."
  }
];

const problems = [
  {
    icon: Inbox,
    title: "Documents eparpilles partout",
    body: "Factures recues sur WhatsApp, par email, sur papier ou dans des dossiers partages differents pour chaque client."
  },
  {
    icon: Clock,
    title: "Relances manuelles sans fin",
    body: "Vos assistants relancent a la main, sans savoir qui a deja repondu ni ce qu'il manque vraiment."
  },
  {
    icon: FileWarning,
    title: "Aucune preuve en cas de litige",
    body: "Impossible de prouver qu'un client a ete relance a temps si son dossier arrive incomplet avant l'echeance."
  },
  {
    icon: AlertTriangle,
    title: "Risque de retard sur les declarations",
    body: "Un document manquant decouvert trop tard peut retarder une declaration TVA et couter cher au client et au cabinet."
  }
];

const audiences = [
  {
    icon: UsersRound,
    title: "Pour le proprietaire du cabinet",
    body: "Voir en un coup d'oeil les collectes en retard, les clients a relancer, les documents a verifier et les dossiers prets."
  },
  {
    icon: ClipboardCheck,
    title: "Pour les assistants",
    body: "Savoir quoi faire aujourd'hui sans chercher dans WhatsApp, les emails ou les dossiers partages."
  },
  {
    icon: LockKeyhole,
    title: "Pour vos clients",
    body: "Deposer les pieces demandees depuis leur telephone, sans creer de compte, avec un message de confiance signe du cabinet."
  }
];

const featureGrid = [
  { icon: LayoutDashboard, label: "Tableau de bord des collectes actives" },
  { icon: Smartphone, label: "Portail de depot mobile pour les clients" },
  { icon: ListChecks, label: "Suivi des documents manquants" },
  { icon: Send, label: "Relances WhatsApp pretes a copier" },
  { icon: FileCheck2, label: "Validation et rejet des fichiers" },
  { icon: FileArchive, label: "Exports CSV et archives propres" },
  { icon: UsersRound, label: "Roles proprietaire, manager, assistant, lecture seule" },
  { icon: ClipboardList, label: "Journal d'audit des actions importantes" }
];

const securityPoints = [
  {
    icon: Layers,
    title: "Cloisonnement strict entre cabinets",
    body: "Chaque cabinet est isole : aucun acces croise aux clients ou documents d'un autre cabinet."
  },
  {
    icon: KeyRound,
    title: "Roles et permissions",
    body: "Proprietaire, manager, assistant ou lecture seule : chacun ne voit que ce qui le concerne."
  },
  {
    icon: ClipboardList,
    title: "Journal d'audit complet",
    body: "Depots, validations, rejets et relances sont horodates pour garder une preuve d'action."
  },
  {
    icon: LockKeyhole,
    title: "Connexions et mots de passe chiffres",
    body: "Acces securise pour le cabinet, lien de depot dedie et sans compte pour les clients."
  }
];

const pricingPlans = [
  {
    name: "Essentiel",
    code: "STARTER",
    price: "399 MAD",
    note: "/ mois",
    description: "Pour un petit cabinet qui veut remplacer WhatsApp et Excel par un suivi simple.",
    highlights: ["20 clients", "1 utilisateur", "Portail de depot client", "Export CSV"],
    cta: "Commencer simple",
    recommended: false
  },
  {
    name: "Professionnel",
    code: "PRO",
    price: "799 MAD",
    note: "/ mois",
    description: "Le meilleur choix pour un cabinet actif avec assistants, exports et reporting.",
    highlights: ["75 clients", "3 utilisateurs", "Export ZIP et rapports avances", "Support prioritaire"],
    cta: "Choisir Professionnel",
    recommended: true
  },
  {
    name: "Cabinet Plus",
    code: "PREMIUM",
    price: "1 490 MAD",
    note: "/ mois",
    description: "Pour les cabinets structures avec plus de volume, marque cabinet et workflows avances.",
    highlights: ["200 clients", "8 utilisateurs", "Portail marque cabinet", "Accompagnement prioritaire"],
    cta: "Parler a TVA Collect",
    recommended: false
  }
];

const faqs = [
  {
    question: "Mes clients doivent-ils creer un compte ?",
    answer:
      "Non. Chaque client recoit un lien de depot securise et personnel. Il depose ses documents depuis son telephone ou son ordinateur, sans mot de passe ni inscription."
  },
  {
    question: "Ou sont stockees les donnees et documents deposes ?",
    answer:
      "Les documents sont stockes dans un espace de stockage securise, avec acces restreint par identifiants techniques. Chaque cabinet est cloisonne : les donnees d'un cabinet ne sont jamais visibles par un autre."
  },
  {
    question: "Combien de temps faut-il pour demarrer ?",
    answer:
      "Un pilote type se met en place en quelques jours sur 5 a 10 clients : import des clients, choix des documents attendus, puis envoi des premiers liens de depot."
  },
  {
    question: "Puis-je changer de plan plus tard ?",
    answer:
      "Oui. Vous demarrez sur le plan adapte a votre nombre de clients actuel, puis vous passez au plan superieur quand le volume augmente."
  },
  {
    question: "Que se passe-t-il si un client ne depose rien ?",
    answer:
      "Le tableau de bord signale immediatement les documents manquants. Des relances pretes a copier (WhatsApp, email) sont generees, avec un historique des relances deja envoyees."
  },
  {
    question: "TVA Collect convient-il a un petit cabinet ?",
    answer:
      "Oui. Le plan Essentiel est concu pour un petit cabinet des 20 clients et 1 utilisateur, sans engagement de longue duree."
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
            <a href="#produit" className="hover:text-white">Produit</a>
            <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
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
              Demander une demo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.24),transparent_42%)]" aria-hidden />

        <div className="relative z-10 mx-auto grid gap-12 px-4 py-16 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24 max-w-7xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-100">
              <ShieldCheck size={14} />
              SaaS pour cabinets comptables marocains
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-[3.4rem]">
              Collectez les documents TVA de vos clients{" "}
              <span className="text-teal-300">sans chaos WhatsApp.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              TVA Collect centralise les demandes, les depots et les relances : un lien de dépôt par client,
              une vue claire de ce qui manque, et une preuve d&apos;action avant chaque declaration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="btn btn-primary px-5">
                Demander une demo <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="btn border-white/20 bg-white text-ink hover:bg-slate-100">
                Demarrer un pilote
              </Link>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sans engagement &middot; Configuration accompagnee &middot; Reponse sous 24h
            </p>
            <dl className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                ["1 lien", "par client"],
                ["0 compte", "cote client"],
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
            <div className="hidden rotate-[-2deg] items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-popover md:absolute md:-left-6 md:-top-6 md:z-20 md:flex">
              <span className="text-red-500 line-through decoration-2">WhatsApp</span>
              <ArrowRight size={12} className="text-muted" />
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 size={14} /> TVA Collect
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
                    ["A relancer", "8"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-surface px-3 py-3">
                      <div className="text-xs font-semibold text-muted">{label}</div>
                      <div className="mt-1 text-2xl font-extrabold">{value}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {[
                    ["Garage Atlas", "Releve bancaire manquant", "Urgent", "bg-red-50 text-red-700"],
                    ["Cafe Central", "Factures recues - a verifier", "A verifier", "bg-amber-50 text-amber-800"],
                    ["Pharma Nord", "Dossier complet", "Pret", "bg-emerald-50 text-emerald-700"]
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
                  <span>8 clients a relancer avant l&apos;echeance de declaration.</span>
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
          <span className="flex items-center gap-2"><ShieldCheck size={14} /> Donnees cloisonnees par cabinet</span>
        </div>
      </section>

      <section id="produit" className="scroll-mt-24 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Qu&apos;est-ce que TVA Collect ?</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Un portail de collecte et de suivi pour les documents TVA.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              TVA Collect remplace les demandes dispersees par WhatsApp, email et dossiers partages.
              Le cabinet cree une collecte, les clients deposent leurs pieces via un lien securise, puis l&apos;equipe
              suit les documents recus, manquants, rejetes et prets a exporter.
            </p>
          </div>
          <div className="grid gap-3">
            {audiences.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="flex items-start gap-4 rounded-lg border border-border bg-white p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <Icon size={21} />
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
      </section>

      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Le probleme</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Le suivi TVA ne devrait pas dependre de WhatsApp et d&apos;Excel.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Sans outil dedie, chaque collecte TVA repose sur la memoire de vos assistants et sur des dizaines
              de conversations eparpillees. Le risque augmente a chaque echeance.
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

      <section id="fonctionnement" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Flux cabinet</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Le chemin normal d&apos;une collecte TVA.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Le produit reste simple: creer la collecte, envoyer les liens, recevoir les documents,
              controler les pieces et exporter ce qui est pret.
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

      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Controle et preuve</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Tout ce qu&apos;il faut pour piloter une collecte TVA.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Les assistants n&apos;ont pas besoin de deviner. Les clients incomplets, les fichiers a verifier,
              les relances et les dossiers prets sont visibles dans l&apos;espace cabinet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo" className="btn btn-primary">
                Demander une demo
              </Link>
              <Link href={loginHref} className="btn">
                Connexion
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureGrid.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex flex-col items-start gap-3 rounded-lg border border-border bg-white p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <Icon size={19} />
                  </span>
                  <span className="text-sm font-bold leading-snug">{feature.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-blue-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[1.1fr_380px] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#0f3460]">Securite</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Les clients deposent. Le cabinet garde le controle.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Les clients ne creent pas de compte. Ils utilisent uniquement un lien de depot.
              Le cabinet gere les utilisateurs, les roles, les fichiers et l&apos;historique.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {securityPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="rounded-lg border border-blue-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-[#0f3460]">
                      <Icon size={18} />
                      <h3 className="font-extrabold text-[#0f3460]">{point.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{point.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <aside className="rounded-xl border border-blue-100 bg-white p-6">
            <div className="flex items-center gap-3 text-[#0f3460]">
              <Building2 size={22} />
              <h3 className="text-xl font-extrabold text-[#0f3460]">Chaque cabinet est isole</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#183b66]">
              Vos clients, vos documents et vos utilisateurs restent strictement separes de ceux
              des autres cabinets utilisant TVA Collect.
            </p>
            <Link href="/contact" className="btn mt-5 bg-[#0f3460] text-white hover:bg-[#0c2a4d]">
              Poser une question securite <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </section>

      <section id="tarifs" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Tarifs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Des tarifs simples, adaptes au marche marocain.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Commencez petit, puis passez au plan superieur quand le nombre de clients augmente.
              Aucune carte n&apos;est necessaire pour demarrer un pilote.
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
                    Recommande
                  </div>
                ) : null}
                <h3 className="pr-24 text-xl font-extrabold">{plan.name}</h3>
                <p className="mt-3 min-h-14 text-sm leading-relaxed text-muted">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm font-semibold text-muted">{plan.note}</span>
                </div>
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
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-6 py-5">
            <p className="text-sm font-semibold text-muted">
              Besoin de voir toutes les limites plan par plan ?
            </p>
            <Link href="/pricing" className="btn">
              Comparer les plans en detail <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07111f] py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(20,184,166,0.18),transparent_45%)]" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-200">
              <BellRing size={16} />
              Pilote TVA Collect
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white">Pret a sortir du chaos WhatsApp ?</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Testez sur quelques clients reels: verifiez que votre equipe peut collecter, relancer et exporter
              sans explication externe.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
            <Link href="/demo" className="btn btn-primary">
              Demander une demo <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn border-white/20 bg-white/5 text-white hover:bg-white/10">
              Demarrer un pilote
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Questions frequentes</p>
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
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Produit</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Produit">
              <a href="#produit" className="hover:text-white">Fonctionnalites</a>
              <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
              <Link href="/pricing" className="hover:text-white">Tarifs</Link>
            </nav>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Cabinet</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Cabinet">
              <Link href="/demo" className="hover:text-white">Demander une demo</Link>
              <Link href="/contact" className="hover:text-white">Demarrer un pilote</Link>
              <Link href={loginHref} className="hover:text-white">Connexion</Link>
            </nav>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Legal</div>
            <nav className="mt-3 grid gap-2 text-sm font-semibold" aria-label="Legal">
              <Link href="/privacy" className="hover:text-white">Confidentialite</Link>
              <Link href="/terms" className="hover:text-white">Conditions</Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs font-medium text-slate-500">
            &copy; {new Date().getFullYear()} TVA Collect. Concu pour les cabinets comptables au Maroc.
          </div>
        </div>
      </footer>
    </main>
  );
}
