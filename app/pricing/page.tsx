import Link from "next/link";

const plans = [
  { name: "Pilote", price: "1 000 MAD", note: "one-time", detail: "Pour tester avec 5 clients." },
  { name: "Cabinet Starter", price: "999 MAD", note: "/ mois", detail: "Jusqu'a 30 clients." },
  { name: "Cabinet Pro", price: "1 999 MAD", note: "/ mois", detail: "Jusqu'a 100 clients." }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-bold text-primary">TVA Collect</Link>
        <h1 className="mt-4 text-3xl font-black">Tarifs simples pour cabinets comptables</h1>
        <p className="mt-2 text-muted">Pas de paiement en ligne dans le MVP. Le pilote se confirme par contact.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <section key={plan.name} className="card p-5">
              <h2 className="text-xl font-black">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="pb-1 text-sm text-muted">{plan.note}</span>
              </div>
              <p className="mt-4 text-sm text-muted">{plan.detail}</p>
              <Link href="/contact" className="btn btn-primary mt-6 w-full">Demander un pilote</Link>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
