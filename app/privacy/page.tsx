import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { supportEmail } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Politique de confidentialité TVA Collect : données collectées, stockage des documents, accès, conservation et sécurité."
};

const sections = [
  {
    title: "1. Qui nous sommes",
    body: [
      "TVA Collect est un service en ligne (SaaS) qui permet aux cabinets comptables et fiduciaires de collecter, suivre et valider les documents TVA transmis par leurs clients, à la place d'échanges dispersés par WhatsApp, email ou messagerie.",
      `Pour toute question relative à cette politique ou à vos données, contactez-nous à ${supportEmail}.`
    ]
  },
  {
    title: "2. Données collectées",
    body: [
      "Selon votre usage du service, nous traitons :",
      "• Données du cabinet et de ses utilisateurs : nom, email professionnel, mot de passe (chiffré), rôle, numéro de téléphone, informations de facturation.",
      "• Données des clients du cabinet : nom ou raison sociale, personne de contact, email, téléphone, ville, identifiants fiscaux (ICE) le cas échéant — saisis par le cabinet, pas par TVA Collect.",
      "• Documents déposés : fichiers transmis via un lien de dépôt (factures, relevés bancaires, justificatifs et autres pièces liées à la TVA), avec leurs métadonnées (nom de fichier, taille, date, statut de validation, commentaires du cabinet).",
      "• Données techniques : adresse IP, journal des connexions et des actions importantes (dépôt, validation, rejet, relance), à des fins de sécurité et de preuve d'action.",
      "• Prospects : si vous demandez une démonstration ou un pilote, les informations transmises via le formulaire de contact sont conservées pour le suivi commercial."
    ]
  },
  {
    title: "3. Stockage des documents",
    body: [
      "Les documents déposés par les clients sont stockés soit dans un espace de stockage local du serveur applicatif, soit dans un espace de stockage compatible S3 (selon la configuration du cabinet/environnement), avec accès restreint par identifiants techniques.",
      "Chaque document est rattaché exclusivement au cabinet qui a créé la demande de collecte. Le cloisonnement entre cabinets (« tenants ») est appliqué à chaque requête d'accès aux données."
    ]
  },
  {
    title: "4. Qui a accès aux données",
    body: [
      "Les documents et informations d'un cabinet sont accessibles uniquement aux utilisateurs de ce cabinet (selon leur rôle) et, à des fins de support ou de maintenance technique, à l'équipe d'administration de TVA Collect.",
      "Les clients qui déposent des documents via un lien de dépôt n'ont pas de compte et ne peuvent pas voir les données d'autres clients ou d'autres cabinets.",
      "Nous ne vendons pas vos données ni celles de vos clients à des tiers. Des prestataires techniques (hébergement, envoi d'emails, paiement) peuvent traiter des données pour le compte de TVA Collect dans le seul but de faire fonctionner le service."
    ]
  },
  {
    title: "5. Conservation des données",
    body: [
      "Les données d'un cabinet actif sont conservées pendant toute la durée d'utilisation du service.",
      "Après résiliation d'un abonnement, les données sont conservées pendant une période limitée permettant une éventuelle réactivation ou export, puis supprimées ou anonymisées, sauf obligation légale de conservation plus longue (notamment en matière comptable et fiscale).",
      "Les liens de dépôt public expirent automatiquement après une durée configurable et peuvent être désactivés à tout moment par le cabinet."
    ]
  },
  {
    title: "6. Sécurité",
    body: [
      "Les mots de passe sont stockés sous forme hachée, jamais en clair. Les sessions utilisent des jetons signés avec expiration.",
      "Les liens de dépôt public utilisent des identifiants uniques non devinables et peuvent être limités dans le temps.",
      "Les actions importantes (dépôt, validation, rejet de document, relance) sont journalisées pour permettre un suivi et une preuve d'activité.",
      "Aucun système n'est invulnérable : en cas d'incident de sécurité affectant vos données, nous nous engageons à vous informer dans les meilleurs délais."
    ]
  },
  {
    title: "7. Vos droits",
    body: [
      "Vous pouvez demander l'accès, la correction ou la suppression des données vous concernant, ou concernant vos clients (via votre cabinet), en écrivant à " + supportEmail + ".",
      "Les demandes concernant les documents d'un client doivent être adressées en priorité au cabinet comptable concerné, qui reste responsable du traitement des données de ses propres clients."
    ]
  },
  {
    title: "8. Conformité Maroc (Loi 09-08 / CNDP)",
    body: [
      "TVA Collect s'adresse en priorité à des cabinets comptables marocains et vise à respecter la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, sous le contrôle de la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP).",
      "Cette page est un modèle de politique de confidentialité destiné à informer clairement cabinets et clients ; elle doit être revue et validée par un conseil juridique avant tout lancement commercial, afin notamment de confirmer les démarches de déclaration/autorisation CNDP applicables et d'adapter le texte à la structure juridique définitive de TVA Collect."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link href="/" className="text-sm font-bold text-primary">← TVA Collect</Link>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
          <p className="mt-2 text-sm text-muted">Dernière mise à jour : à compléter lors de la validation juridique.</p>
        </div>

        <div className="alert alert-warning">
          <AlertTriangle size={18} />
          <div>
            <div className="font-extrabold">Document provisoire</div>
            <div>
              Ce texte est un modèle destiné à couvrir les points essentiels avant le lancement pilote. Il doit être relu et validé par
              un conseil juridique (droit marocain, Loi 09-08, CNDP) avant toute utilisation commerciale.
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="font-extrabold">{section.title}</h2>
            <div className="mt-2 grid gap-2 text-sm leading-relaxed text-muted">
              {section.body.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <p className="text-center text-xs text-muted">
          Voir aussi nos <Link href="/terms" className="font-bold text-primary">conditions d&apos;utilisation</Link>. Contact :{" "}
          <a href={`mailto:${supportEmail}`} className="font-bold text-primary">{supportEmail}</a>
        </p>
      </div>
    </main>
  );
}
