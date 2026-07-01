import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      {/* UX-FIX: styled unauthorized page for permission failures. */}
      <section className="empty-state max-w-xl">
        <div>
          <h1 className="text-2xl font-black">Acces non autorise</h1>
          <p>Votre compte n&apos;a pas les droits necessaires pour consulter cette page.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/app" className="btn btn-primary">Retour espace cabinet</Link>
          <Link href="/login" className="btn">Changer de compte</Link>
        </div>
      </section>
    </main>
  );
}
