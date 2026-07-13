import { ArrowLeft, Landmark, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { requireFirmUser } from "@/lib/auth";
import { buildClientComplianceProfile, complianceTrendLabel, serviceTierLabel } from "@/lib/client-compliance";
import { fiscalSeverityLabel, tvaFrequencyLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, firmId: user.firmId, deletedAt: null },
    include: {
      clientCollections: {
        where: { deletedAt: null },
        include: { collectionPeriod: true, requiredDocuments: true, uploadedDocuments: { where: { deletedAt: null } }, reminderLogs: true },
        orderBy: { createdAt: "desc" }
      },
      fiscalProfile: true
    }
  });

  if (!client) {
    return <div className="card p-6">Client introuvable.</div>;
  }
  const compliance = buildClientComplianceProfile(client.clientCollections);

  return (
    <div className="content-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/clients" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Clients</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{client.companyName}</h1>
          <p className="text-sm text-muted">Fiche client, historique et comportement de dépôt.</p>
        </div>
        <form action={deleteClientAction.bind(null, client.id)}>
          <button className="btn btn-danger"><Trash2 size={16} /> Supprimer</button>
        </form>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className={`rounded-lg border p-4 ${compliance.tone}`}>
          <div className="text-sm font-bold">Score de conformité</div>
          <div className="mt-2 text-4xl font-black">{compliance.score}/100</div>
          <div className="mt-1 text-sm font-black">{compliance.label}</div>
          <div className="mt-4 text-sm">Pression recommandée : <span className="font-extrabold">{compliance.pressureLevel}</span></div>
          <div className="text-sm">Timing relance: <span className="font-extrabold">{compliance.nextReminderTiming}</span></div>
        </div>
        <div className="card p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">Profil comportement client</h2>
              <p className="text-sm text-muted">{compliance.pressureStrategy}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              Tendance: <span className="font-extrabold">{complianceTrendLabel(compliance.trend)}</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Réponse moyenne</div>
              <div className="mt-1 text-xl font-black">{compliance.averageResponseDays ?? "-"} j</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Retard moyen</div>
              <div className="mt-1 text-xl font-black">{compliance.averageDelayDays ?? 0} j</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Relances / période</div>
              <div className="mt-1 text-xl font-black">{compliance.averageReminders}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs font-bold text-muted">Friction</div>
              <div className="mt-1 text-xl font-black">{compliance.frictionScore}/100</div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-black">Pourquoi ce score ?</h3>
              <ul className="mt-2 grid gap-2 text-sm text-muted">
                {compliance.breakdown.map((reason) => <li key={reason}>- {reason}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-black">Alertes comportement</h3>
              <ul className="mt-2 grid gap-2 text-sm text-muted">
                {compliance.alerts.map((alert) => <li key={alert}>- {alert}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-border p-3 text-sm">
            Niveau de service recommandé : <span className="font-extrabold">{serviceTierLabel(compliance.serviceTier)}</span>
            {compliance.repricingSignal ? <span className="ml-2 font-black text-red-700">Signal revalorisation</span> : null}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-black"><Landmark size={17} /> Profil fiscal</div>
            <p className="mt-1 text-sm text-muted">
              {client.fiscalProfile
                ? `TVA : ${tvaFrequencyLabel(client.fiscalProfile.tvaFrequency)}, risque : ${fiscalSeverityLabel(client.fiscalProfile.fiscalRiskLevel)}.`
                : "Profil fiscal incomplet : fréquence TVA, régime, ICE/IF et responsable dossier à compléter."}
            </p>
          </div>
          <Link href={`/app/clients/${client.id}/fiscal-profile`} className="btn">
            {client.fiscalProfile ? "Modifier fiscal" : "Compléter fiscal"}
          </Link>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-extrabold">Informations client</h2>
        <form action={updateClientAction.bind(null, client.id)} className="grid gap-4">
          <div className="field-grid">
            <label>Société<input name="companyName" defaultValue={client.companyName} required /></label>
            <label>Contact<input name="contactName" defaultValue={client.contactName || ""} /></label>
            <label>Téléphone<input name="phone" defaultValue={client.phone || ""} /></label>
            <label>Email<input name="email" type="email" defaultValue={client.email || ""} /></label>
            <label>ICE<input name="ice" defaultValue={client.ice || ""} /></label>
            <label>IF<input name="taxId" defaultValue={client.taxId || ""} /></label>
            <label>Ville<input name="city" defaultValue={client.city || ""} /></label>
          </div>
          <label>Notes<textarea name="notes" rows={3} defaultValue={client.notes || ""} /></label>
          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer</button>
        </form>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Historique collectes</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Statut</th>
                <th>Documents reçus</th>
                <th>Manquants</th>
                <th>Dernier dépôt</th>
              </tr>
            </thead>
            <tbody>
              {client.clientCollections.map((item) => (
                <tr key={item.id}>
                  <td><Link className="font-bold" href={`/app/collections/${item.collectionPeriodId}`}>{item.collectionPeriod.name}</Link></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.uploadedDocuments.length}</td>
                  <td>{item.requiredDocuments.filter((doc) => doc.status === "MISSING").length}</td>
                  <td>{formatDate(item.uploadedDocuments[0]?.createdAt)}</td>
                </tr>
              ))}
              {!client.clientCollections.length ? (
                <tr><td colSpan={5} className="text-muted">Aucune collecte pour ce client.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
