import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { supportEmail } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation TVA Collect : périmètre du service, responsabilités, dépôt de documents, abonnement et résiliation."
};

const sections = [
  {
    title: "1. Périmètre du service",
    body: [
      "TVA Collect est un outil de collecte et de suivi documentaire destiné aux cabinets comptables et fiduciaires : création de demandes de collecte par période, génération de liens de dépôt sécurisés pour les clients, suivi des documents reçus/manquants/validés/rejetés, relances et export.",
      "TVA Collect ne réalise pas de déclaration fiscale automatique et ne remplace pas le jugement professionnel du cabinet comptable. Le cabinet reste seul responsable de la validation comptable, fiscale et juridique des informations traitées et des déclarations effectuées auprès des administrations compétentes."
    ]
  },
  {
    title: "2. Compte et responsabilité de l'utilisateur",
    body: [
      "Le cabinet est responsable de la confidentialité des identifiants de connexion de ses utilisateurs et de l'usage fait du compte, y compris les actions de ses employés invités (rôles propriétaire, responsable, assistant, lecture seule).",
      "Le cabinet s'engage à fournir des informations exactes sur son activité, ses utilisateurs et ses clients, et à utiliser le service conformément à la loi applicable, notamment en matière de protection des données personnelles.",
      "Les clients du cabinet qui déposent des documents via un lien de dépôt n'ont pas de compte séparé ; ils sont réputés agir avec l'accord du cabinet qui leur a transmis le lien."
    ]
  },
  {
    title: "3. Dépôt et traitement des documents",
    body: [
      "Les clients doivent transmettre des documents lisibles, complets et liés à la période indiquée. Les documents tardifs, illisibles ou incomplets peuvent retarder le traitement du dossier — TVA Collect n'est pas responsable des conséquences d'un dépôt tardif ou incomplet par le client final.",
      "Le cabinet est responsable de la validation ou du rejet des documents déposés, y compris des motifs de rejet communiqués au client.",
      "Il est interdit de déposer des fichiers illégaux, malveillants (virus, scripts) ou sans rapport avec l'objet de la demande. TVA Collect peut suspendre l'accès à un lien de dépôt utilisé de façon abusive."
    ]
  },
  {
    title: "4. Disponibilité et limitation de responsabilité",
    body: [
      "TVA Collect met en œuvre des moyens raisonnables pour assurer la disponibilité, la sécurité et l'intégrité du service, sans garantie de fonctionnement ininterrompu ou sans erreur.",
      "Dans les limites permises par la loi applicable, la responsabilité de TVA Collect envers un cabinet est limitée aux montants effectivement payés par ce cabinet au cours des douze (12) derniers mois, et exclut les dommages indirects (perte de chiffre d'affaires, perte de données résultant d'une absence de sauvegarde propre au cabinet, préjudice d'image).",
      "Cette clause de limitation de responsabilité doit être revue par un conseil juridique afin de vérifier sa validité et son adaptation au droit marocain avant toute mise en production commerciale."
    ]
  },
  {
    title: "5. Abonnement et paiement",
    body: [
      "L'accès payant à TVA Collect est proposé sous forme d'abonnement mensuel ou annuel, selon le plan choisi (voir la page Tarifs), avec des limites d'usage (nombre de clients, d'utilisateurs, de stockage) propres à chaque plan.",
      "Le paiement peut être effectué par virement bancaire avec justificatif, ou par carte via un prestataire de paiement tiers, selon les moyens proposés au moment de la souscription.",
      "Un essai ou pilote peut être proposé avant tout engagement payant ; ses conditions (durée, périmètre, passage à l'abonnement payant) sont communiquées séparément lors de la mise en place du pilote.",
      "En cas d'impayé, l'accès aux fonctionnalités peut être limité (lecture seule, blocage du dépôt public) après un délai de grâce, sans suppression immédiate des données."
    ]
  },
  {
    title: "6. Résiliation",
    body: [
      "Le cabinet peut demander la résiliation de son abonnement à tout moment en contactant le support ; la résiliation prend effet à la fin de la période déjà payée, sauf accord contraire.",
      "TVA Collect peut suspendre ou résilier un compte en cas de violation grave de ces conditions (usage illégal, non-paiement prolongé, abus de la plateforme), après notification lorsque cela est raisonnablement possible.",
      "Après résiliation, les données sont conservées pendant une période limitée permettant un export ou une réactivation, selon les modalités décrites dans la politique de confidentialité, puis supprimées."
    ]
  },
  {
    title: "7. Support et contact",
    body: [
      `Pour toute question sur ces conditions, un incident, ou une demande d'assistance, contactez ${supportEmail}.`,
      "Voir également notre politique de confidentialité pour le détail du traitement des données personnelles."
    ]
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link href="/" className="text-sm font-bold text-primary">← TVA Collect</Link>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Conditions d&apos;utilisation</h1>
          <p className="mt-2 text-sm text-muted">Dernière mise à jour : à compléter lors de la validation juridique.</p>
        </div>

        <div className="alert alert-warning">
          <AlertTriangle size={18} />
          <div>
            <div className="font-extrabold">Document provisoire</div>
            <div>
              Ce texte est un modèle destiné à couvrir les points essentiels avant le lancement pilote. Il doit être relu et validé par
              un conseil juridique (droit marocain) avant toute utilisation commerciale, notamment les clauses de responsabilité et de
              paiement.
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
          Voir aussi notre <Link href="/privacy" className="font-bold text-primary">politique de confidentialité</Link>. Contact :{" "}
          <a href={`mailto:${supportEmail}`} className="font-bold text-primary">{supportEmail}</a>
        </p>
      </div>
    </main>
  );
}
