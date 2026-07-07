import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileArchive,
  FileCheck2,
  FolderKanban,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
  UsersRound
} from "lucide-react";
import Link from "next/link";

const workflow = [
  {
    icon: FolderKanban,
    title: "Creer une collecte",
    body: "Le cabinet choisit la periode TVA, ajoute les clients concernes et prepare la liste des documents attendus."
  },
  {
    icon: UploadCloud,
    title: "Envoyer un lien client",
    body: "Chaque client recoit un lien de depot securise. Aucun compte client n'est necessaire."
  },
  {
    icon: FileCheck2,
    title: "Verifier les pieces",
    body: "L'assistant voit les documents recus, manquants, invalides et prets a traiter."
  },
  {
    icon: MessageSquareText,
    title: "Relancer proprement",
    body: "Les relances sont pretes a copier, avec historique et preuve d'action."
  }
];

const features = [
  "Tableau de bord des collectes actives",
  "Portail de depot mobile pour les clients",
  "Suivi des documents manquants",
  "Relances WhatsApp pretes a copier",
  "Validation et rejet des fichiers",
  "Exports CSV et archives propres",
  "Roles proprietaire, manager, assistant et lecture seule",
  "Journal d'audit des actions importantes"
];

const audiences = [
  {
    icon: UsersRound,
    title: "Pour le proprietaire du cabinet",
    body: "Voir les collectes en retard, les clients a relancer, les documents a verifier et les dossiers prets."
  },
  {
    icon: ClipboardCheck,
    title: "Pour les assistants",
    body: "Savoir quoi faire aujourd'hui sans chercher dans WhatsApp, emails ou dossiers partages."
  },
  {
    icon: LockKeyhole,
    title: "Pour les clients",
    body: "Deposer les pieces demandees depuis telephone, sans creer de compte et avec un message de confiance du cabinet."
  }
];

export default function LandingPage() {
  return (
    <main className="bg-white text-ink">
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.24),transparent_42%)]" aria-hidden />
        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex items-center gap-3 text-lg font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black">
                TVA
              </span>
              TVA Collect
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex" aria-label="Navigation publique">
              <a href="#definition" className="hover:text-white">Produit</a>
              <a href="#fonctionnement" className="hover:text-white">Fonctionnement</a>
              <a href="#preuve" className="hover:text-white">Preuve</a>
              <Link href="/pricing" className="hover:text-white">Tarifs</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn hidden border-white/20 bg-white/5 text-white hover:bg-white/10 sm:inline-flex">
                Connexion
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Pilote
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(92vh-73px)] max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-100">
              <ShieldCheck size={14} />
              SaaS pour cabinets comptables marocains
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-[3.4rem]">
              TVA Collect centralise la collecte des documents TVA.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              TVA Collect aide les cabinets comptables et fiduciaires a demander les pieces, recevoir les fichiers,
              suivre ce qui manque, relancer les clients et garder une preuve claire avant declaration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn btn-primary px-5">
                Demarrer un pilote <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="btn border-white/20 bg-white text-ink hover:bg-slate-100">
                Voir la demo
              </Link>
            </div>
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

          <div className="rounded-xl border border-white/10 bg-white p-5 text-ink shadow-2xl shadow-black/40">
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
      </section>

      <section id="definition" className="py-20">
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

      <section id="fonctionnement" className="border-y border-border bg-surface py-20">
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

      <section id="preuve" className="py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Controle et preuve</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Une interface faite pour le travail quotidien.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Les assistants n&apos;ont pas besoin de deviner. Les clients incomplets, les fichiers a verifier,
              les relances et les dossiers prets sont visibles dans l&apos;espace cabinet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="btn btn-primary">
                Demander un pilote
              </Link>
              <Link href="/login" className="btn">
                Connexion
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 text-sm font-semibold">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-blue-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#0f3460]">Securite</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Les clients deposent. Le cabinet garde le controle.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Les clients ne creent pas de compte. Ils utilisent uniquement un lien de depot.
              Le cabinet gere les utilisateurs, les roles, les fichiers et l&apos;historique.
            </p>
          </div>
          <aside className="rounded-xl border border-blue-100 bg-white p-6">
            <div className="flex items-center gap-3 text-[#0f3460]">
              <FileArchive size={22} />
              <h3 className="text-xl font-extrabold">Documents organises</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#183b66]">
              Les pieces recues peuvent etre controlees, classees et exportees proprement pour le traitement comptable.
            </p>
            <Link href="/contact" className="btn mt-5 bg-[#0f3460] text-white">
              Lancer un pilote <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-[#0f3460] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-teal-200">
              <BellRing size={16} />
              Pilote TVA Collect
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Testez sur quelques clients reels.</h2>
            <p className="mt-3 max-w-2xl text-blue-100">
              L&apos;objectif est simple: verifier que votre equipe peut collecter, relancer et exporter sans explication externe.
            </p>
          </div>
          <Link href="/contact" className="btn bg-white text-[#0f3460] hover:bg-blue-50">
            Demander le pilote <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted">
        <div>
          <div className="font-extrabold text-ink">TVA Collect</div>
          <p className="mt-1">Collecte de documents TVA pour cabinets comptables marocains.</p>
        </div>
        <nav className="flex flex-wrap gap-4 font-semibold" aria-label="Pied de page">
          <Link href="/pricing">Tarifs</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Confidentialite</Link>
          <Link href="/terms">Conditions</Link>
          <Link href="/login">Connexion</Link>
        </nav>
      </footer>
    </main>
  );
}
