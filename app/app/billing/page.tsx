import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/utils";

export default async function BillingPage() {
  const user = await requireUser();
  const [clients, documents] = await Promise.all([
    prisma.client.count({ where: { firmId: user.firmId } }),
    prisma.uploadedDocument.findMany({ where: { firmId: user.firmId }, select: { size: true } })
  ]);
  const storageUsed = documents.reduce((sum, document) => sum + document.size, 0);
  const clientLimit = 30;
  const clientUsage = Math.round((clients / clientLimit) * 100);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Billing</h1>
        <p className="text-sm text-muted">Statut manuel du plan et usage actuel. Aucun paiement en ligne pour le moment.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Plan actuel</div>
          <div className="mt-2 text-2xl font-black">Starter</div>
          <p className="mt-1 text-sm text-muted">999 MAD / mois</p>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Clients</div>
          <div className="mt-2 text-2xl font-black">{clients}/{clientLimit}</div>
          <p className="mt-1 text-sm text-muted">{clientUsage}% du quota utilise</p>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Stockage utilise</div>
          <div className="mt-2 text-2xl font-black">{formatBytes(storageUsed)}</div>
          <p className="mt-1 text-sm text-muted">{documents.length} fichier(s)</p>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-black">Passer au plan Pro</h2>
        <p className="mt-2 text-sm text-muted">
          Le plan Pro inclut 100 clients, 3 utilisateurs, exports avances, modeles et support prioritaire.
        </p>
        <Link href="/contact" className="btn btn-primary mt-4">Demander upgrade</Link>
      </section>
    </div>
  );
}
