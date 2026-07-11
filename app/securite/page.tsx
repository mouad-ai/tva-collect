import {
  ArrowRight,
  ClipboardList,
  DatabaseBackup,
  Link2,
  LockKeyhole,
  Mail,
  Server,
  ShieldCheck,
  Trash2,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { supportEmail } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Données et sécurité",
  description:
    "Comment TVA Collect protège les documents TVA de vos clients : stockage, accès, liens de dépôt sécurisés, sans compte client, et suppression des données."
};

const faqs = [
  {
    icon: Server,
    question: "Où sont stockés les documents ?",
    answer: [
      "Les documents déposés par vos clients sont conservés dans un espace de stockage à accès restreint, protégé par des identifiants techniques. Selon la configuration de l'environnement, il s'agit d'un stockage sur le serveur applicatif ou d'un stockage compatible S3 dédié.",
      "Chaque document est rattaché exclusivement au cabinet qui a créé la collecte. Le cloisonnement entre cabinets est appliqué à chaque accès : un cabinet ne peut jamais voir les documents d'un autre."
    ]
  },
  {
    icon: UsersRound,
    question: "Qui peut accéder aux fichiers ?",
    answer: [
      "Uniquement les utilisateurs de votre cabinet, selon leur rôle (propriétaire, manager, assistant ou lecture seule). Vous décidez qui voit et qui agit.",
      "L'équipe technique de TVA Collect peut accéder aux données à des fins de support ou de maintenance, sans jamais les revendre ni les utiliser à d'autres fins. Les clients qui déposent des pièces n'ont, eux, aucun accès aux données d'autres clients ou cabinets."
    ]
  },
  {
    icon: LockKeyhole,
    question: "Est-ce que le client doit créer un compte ?",
    answer: [
      "Non. Vos clients ne créent aucun compte et n'installent aucune application. Ils reçoivent un lien de dépôt unique et personnel, et déposent leurs documents depuis leur téléphone ou leur ordinateur.",
      "C'est volontaire : moins de friction pour le client, donc un meilleur taux de dépôt pour votre cabinet."
    ]
  },
  {
    icon: Link2,
    question: "Comment les liens de dépôt sont-ils sécurisés ?",
    answer: [
      "Chaque lien contient un identifiant unique et non devinable, propre à un client et à une collecte.",
      "Les liens peuvent expirer automatiquement après une durée configurable et être désactivés à tout moment par le cabinet. Les dépôts et actions importantes sont journalisés (horodatés) pour garder une preuve d'activité."
    ]
  },
  {
    icon: ClipboardList,
    question: "Gardez-vous une trace des actions ?",
    answer: [
      "Oui. Les dépôts, validations, rejets et relances sont horodatés dans un journal d'audit, afin que le cabinet dispose d'une preuve d'action claire — utile notamment en cas de dossier incomplet avant une échéance."
    ]
  },
  {
    icon: DatabaseBackup,
    question: "Les données sont-elles sauvegardées ?",
    answer: [
      "Une procédure de sauvegarde et de restauration des données est documentée dans le déploiement de TVA Collect. L'objectif est de pouvoir restaurer les données du cabinet en cas d'incident technique.",
      "Les modalités précises (fréquence, rétention, copie hors-site) dépendent de l'environnement d'hébergement et sont confirmées lors de la mise en place."
    ]
  },
  {
    icon: Trash2,
    question: "Comment demander la suppression des données ?",
    answer: [
      `Écrivez-nous à ${supportEmail} en précisant votre cabinet et la demande. Les documents peuvent aussi être supprimés depuis l'espace cabinet par un utilisateur autorisé.`,
      "Les demandes concernant les documents d'un client final doivent d'abord être adressées au cabinet comptable concerné, qui reste responsable du traitement des données de ses propres clients. Certaines données peuvent être conservées le temps requis par les obligations légales, notamment comptables et fiscales."
    ]
  }
];

const highlights = [
  "Accès par lien sécurisé, sans compte client",
  "Chaque cabinet voit uniquement ses propres données",
  "Historique horodaté des actions",
  "Stockage centralisé à accès restreint",
  "Sauvegarde et restauration documentées",
  "Support en français"
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="border-b border-white/10 bg-[#07111f] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-extrabold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-white">
              TVA
            </span>
            TVA Collect
          </Link>
          <Link href="/demo" className="btn btn-primary">
            Réserver une démo
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.22),transparent_45%)]" aria-hidden />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-14 md:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-100">
            <ShieldCheck size={14} />
            Données et sécurité
          </div>
          <h1 className="mt-6 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
            Vos clients vous confient des documents financiers. Voici comment nous les protégeons.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            TVA Collect est conçu pour que les documents de vos clients restent privés, cloisonnés par cabinet,
            et sous votre contrôle. Voici les réponses claires aux questions que posent les cabinets.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs font-bold uppercase tracking-wide text-muted">
          {highlights.map((item) => (
            <span key={item} className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-primary" /> {item}
            </span>
          ))}
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-5xl gap-4 px-4">
          {faqs.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.question} className="rounded-xl border border-border bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <Icon size={21} />
                  </span>
                  <h2 className="text-lg font-extrabold">{item.question}</h2>
                </div>
                <div className="mt-4 grid gap-2 text-sm leading-relaxed text-muted">
                  {item.answer.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-2 font-extrabold text-amber-900">
              <ShieldCheck size={18} />
              Cadre réglementaire (Maroc)
            </div>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              TVA Collect s&apos;adresse en priorité aux cabinets comptables marocains et vise à respecter la
              loi n° 09-08 relative à la protection des données à caractère personnel, sous le contrôle de la CNDP.
              Une revue juridique finale est recommandée pour l&apos;alignement avec les obligations applicables,
              notamment en matière de protection des données.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-amber-900">
              Pour le détail complet du traitement des données, consultez notre{" "}
              <Link href="/privacy" className="font-bold underline">politique de confidentialité</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Une question sur la sécurité ?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Écrivez-nous — nous répondons en français.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              <Mail size={16} /> {supportEmail}
            </a>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className="btn btn-primary">
              Réserver une démo de 15 min <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn">
              Demander un accès pilote
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
