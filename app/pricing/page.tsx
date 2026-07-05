import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Tarifs TVA Collect pour piloter la collecte TVA dans un cabinet comptable."
};

const plans = [
  { name: "Pilote", price: "1 000 MAD", note: "une fois", detail: "Pour tester avec 5 clients." },
  { name: "Cabinet Starter", price: "999 MAD", note: "/ mois", detail: "Jusqu'à 30 clients." },
  { name: "Cabinet Pro", price: "1 999 MAD", note: "/ mois", detail: "Jusqu'à 100 clients." }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="app-shell-brand text-base">
          <span className="app-shell-brand-mark">TVA</span>
          TVA Collect
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Tarifs simples pour cabinets comptables</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Confirmation par contact et accompagnement pendant le démarrage — pas de carte bancaire pour le pilote.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <section key={plan.name} className="card p-6">
              <h2 className="text-xl font-extrabold">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="pb-1 text-sm text-muted">{plan.note}</span>
              </div>
              <p className="mt-4 text-sm text-muted">{plan.detail}</p>
              <Link href="/contact" className="btn btn-primary mt-6 w-full">
                Demander un pilote
              </Link>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
