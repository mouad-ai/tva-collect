"use client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="empty-state max-w-xl">
        <div>
          <h1 className="text-2xl font-black">Une erreur est survenue</h1>
          <p>Impossible de charger cette page. Reessayez dans un instant. Si le probleme continue, contactez le support.</p>
          {error.digest ? <p className="mt-2 text-xs">Reference: {error.digest}</p> : null}
        </div>
        <button className="btn btn-primary" onClick={reset}>Reessayer</button>
      </section>
    </main>
  );
}
