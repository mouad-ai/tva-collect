import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="empty-state max-w-xl">
        <div>
          <h1 className="text-2xl font-black">Page introuvable</h1>
          <p>Le lien est incorrect, expire ou la page a été deplacee.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">Retour accueil</Link>
          <Link href="/login" className="btn">Connexion</Link>
        </div>
      </section>
    </main>
  );
}
