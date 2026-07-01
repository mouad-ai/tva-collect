import { PageHeader } from "@/components/PageHeader";

const sections = [
  {
    title: "Ajouter des clients",
    body: "Ajoutez un client depuis Clients, ou importez une liste CSV avec nom, contact, email, téléphone, ICE et ville."
  },
  {
    title: "Créer une collecte TVA",
    body: "Allez dans Collectes TVA, créez une période mensuelle, sélectionnez les clients, puis activez les liens de dépôt."
  },
  {
    title: "Envoyer les liens",
    body: "Depuis une collecte, copiez le lien de dépôt individuel ou générez les relances WhatsApp et email."
  },
  {
    title: "Suivre les documents manquants",
    body: "La page de détail d'une collecte montre les documents reçus, manquants, le risque d'échéance et la prochaine action."
  },
  {
    title: "Vérifier les documents",
    body: "Dans Documents, classez chaque fichier, marquez-le valide ou indiquez le problème si le document est illisible, faux ou incomplet."
  },
  {
    title: "Exporter",
    body: "Les exports CSV sont disponibles depuis chaque collecte et depuis Rapports pour partager l'état d'avancement."
  }
];

const launchMessages = [
  {
    title: "Annonce portail",
    body: "Bonjour [Client],\n\nPour mieux suivre les documents TVA et éviter les pertes sur WhatsApp ou email, notre cabinet utilise désormais un portail de dépôt sécurisé.\n\nMerci d'utiliser ce lien pour envoyer vos documents du mois :\n[Lien dépôt]\n\nCabinet [Nom cabinet]"
  },
  {
    title: "Pourquoi pas WhatsApp",
    body: "Merci pour l'envoi. Pour que le document soit bien suivi dans votre dossier, merci de le déposer aussi dans le portail :\n[Lien dépôt]"
  },
  {
    title: "Comment déposer",
    body: "1. Ouvrez le lien\n2. Vérifiez les documents demandés\n3. Ajoutez vos fichiers\n4. Confirmez l'envoi\n5. Gardez la preuve de dépôt"
  },
  {
    title: "Rassurance confidentialité",
    body: "Vos fichiers sont transmis uniquement à votre cabinet comptable. Aucun compte n'est nécessaire pour déposer vos documents."
  }
];

export default function HelpPage() {
  return (
    <div className="content-stack">
      <PageHeader
        title="Aide"
        description="Guide rapide pour utiliser TVA Collect au quotidien."
      />

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="card p-5">
            <h2 className="font-extrabold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Kit lancement client</h2>
        <p className="mt-2 text-sm text-muted">Messages prêts pour habituer les clients au portail et réduire les envois WhatsApp.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {launchMessages.map((message) => (
            <div key={message.title} className="rounded-lg border border-border p-4">
              <h3 className="font-extrabold">{message.title}</h3>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{message.body}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-extrabold">Besoin d&apos;assistance</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Vérifiez d&apos;abord les informations du cabinet dans Paramètres. Pour un problème bloquant, contactez le support TVA Collect avec le nom du cabinet, le client concerné et la collecte.
        </p>
      </section>
    </div>
  );
}
