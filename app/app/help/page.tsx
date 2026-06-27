const sections = [
  {
    title: "Ajouter des clients",
    body: "Ajoutez un client depuis Clients, ou importez une liste CSV avec nom, contact, email, telephone, ICE et ville."
  },
  {
    title: "Creer une collecte TVA",
    body: "Allez dans Collectes TVA, creez une periode mensuelle, selectionnez les clients, puis activez les liens de depot."
  },
  {
    title: "Envoyer les liens",
    body: "Depuis une collecte, copiez le lien de depot individuel ou genereez les relances WhatsApp et email."
  },
  {
    title: "Suivre les documents manquants",
    body: "La page de detail d'une collecte montre les documents recus, manquants, le risque d'echeance et la prochaine action."
  },
  {
    title: "Verifier les documents",
    body: "Dans Documents, classez chaque fichier, marquez-le valide ou indiquez le probleme si le document est illisible, faux ou incomplet."
  },
  {
    title: "Exporter",
    body: "Les exports CSV sont disponibles depuis chaque collecte et depuis Rapports pour partager l'etat d'avancement."
  }
];

const launchMessages = [
  {
    title: "Annonce portail",
    body: "Bonjour [Client],\n\nPour mieux suivre les documents TVA et eviter les pertes sur WhatsApp ou email, notre cabinet utilise desormais un portail de depot securise.\n\nMerci d'utiliser ce lien pour envoyer vos documents du mois :\n[Upload Link]\n\nCabinet [Firm Name]"
  },
  {
    title: "Pourquoi pas WhatsApp",
    body: "Merci pour l'envoi. Pour que le document soit bien suivi dans votre dossier, merci de le deposer aussi dans le portail :\n[Upload Link]"
  },
  {
    title: "Comment deposer",
    body: "1. Ouvrez le lien\n2. Verifiez les documents demandes\n3. Ajoutez vos fichiers\n4. Confirmez l'envoi\n5. Gardez la preuve de depot"
  },
  {
    title: "Rassurance confidentialite",
    body: "Vos fichiers sont transmis uniquement a votre cabinet comptable. Aucun compte n'est necessaire pour deposer vos documents."
  }
];

export default function HelpPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Aide</h1>
        <p className="text-sm text-muted">Guide rapide pour utiliser TVA Collect au quotidien.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="card p-4">
            <h2 className="font-black">{section.title}</h2>
            <p className="mt-2 text-sm text-muted">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="card p-4">
        <h2 className="font-black">Client Launch Kit</h2>
        <p className="mt-2 text-sm text-muted">Messages prets pour habituer les clients au portail et reduire les envois WhatsApp.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {launchMessages.map((message) => (
            <div key={message.title} className="rounded-md border border-border p-3">
              <h3 className="font-black">{message.title}</h3>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted">{message.body}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-black">Besoin d&apos;assistance</h2>
        <p className="mt-2 text-sm text-muted">
          Verifiez d&apos;abord les informations du cabinet dans Parametres. Pour un probleme bloquant, contactez le support TVA Collect avec le nom du cabinet, le client concerne et la collecte.
        </p>
      </section>
    </div>
  );
}
