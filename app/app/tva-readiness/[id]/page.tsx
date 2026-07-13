import { ArrowLeft, FilePlus2, LockKeyhole, Save } from "lucide-react";
import { TvaAmountEntryType, TvaPreparationStatus } from "@prisma/client";
import Link from "next/link";
import { createTvaAmountEntryAction, lockClientCollectionAction, unlockClientCollectionAction, updateTvaPreparationStatusAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { monthNames, workflowTemplateFromType } from "@/lib/constants";
import { fiscalSeverityLabel } from "@/lib/fiscal-audit";
import { prisma } from "@/lib/prisma";
import { calculateTvaReadiness, preparationStatusLabel, readinessStatusLabel, readinessTone } from "@/lib/tva-readiness";
import { cn, formatDate } from "@/lib/utils";

const typeLabel: Record<TvaAmountEntryType, string> = {
  PURCHASE: "Achat",
  SALE: "Vente",
  EXPENSE: "Frais",
  CREDIT_NOTE: "Avoir"
};

const riskTone = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-800"
};

function formatMad(amount: number) {
  return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 2 }).format(amount);
}

function moneyValue(value: unknown) {
  return value == null ? "" : String(value);
}

export const metadata = { title: "Préparation TVA" };

export default async function TvaReadinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const item = await prisma.clientCollection.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      client: true,
      collectionPeriod: true,
      requiredDocuments: true,
      uploadedDocuments: { include: { requiredDocument: true }, orderBy: { createdAt: "desc" } },
      tvaAmountEntries: { include: { uploadedDocument: true }, orderBy: { createdAt: "desc" } },
      tvaReadinessChecks: { orderBy: { generatedAt: "desc" }, take: 5 }
    }
  });

  if (!item) {
    return <div className="card p-6">Dossier TVA introuvable.</div>;
  }

  const readiness = calculateTvaReadiness(item);
  const template = workflowTemplateFromType(item.collectionPeriod.workflowType);

  return (
    <div className="content-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/tva-readiness" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Préparation TVA</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{item.client.companyName}</h1>
          <p className="text-sm text-muted">{template.label} - {monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/client-collections/${item.id}/tva-entries.csv`} className="btn">Export TVA CSV</a>
          <Link href={`/app/documents?clientId=${item.clientId}&collectionPeriodId=${item.collectionPeriodId}`} className="btn">Documents</Link>
          <Link href={`/app/collections/${item.collectionPeriodId}`} className="btn">Collecte</Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className={cn("rounded-lg border p-4", readinessTone(readiness.status))}>
          <div className="text-sm font-bold">Readiness score</div>
          <div className="mt-2 text-4xl font-black">{readiness.score}/100</div>
          <div className="mt-1 text-sm font-black">{readinessStatusLabel(readiness.status)}</div>
          <div className={cn("badge mt-4", riskTone[readiness.riskLevel])}>
            <span className="badge-dot" aria-hidden="true" />
            Risque {fiscalSeverityLabel(readiness.riskLevel)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">Workflow préparation TVA</h2>
              <p className="text-sm text-muted">Impossible de passer à prêt déclaration si le readiness est bloqué.</p>
            </div>
            <span className="rounded-md border border-border px-3 py-2 text-sm font-black">{preparationStatusLabel(item.tvaPreparationStatus)}</span>
          </div>
          <form action={updateTvaPreparationStatusAction.bind(null, item.id)} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[240px]">
              Nouveau statut
              <select name="tvaPreparationStatus" defaultValue={item.tvaPreparationStatus}>
                {Object.values(TvaPreparationStatus).map((status) => (
                  <option key={status} value={status}>{preparationStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary"><Save size={16} /> Enregistrer statut</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.isLocked ? (
              <form action={unlockClientCollectionAction.bind(null, item.id)} className="flex flex-wrap gap-2">
                <input name="unlockReason" placeholder="Raison de réouverture" required />
                <button className="btn">Rouvrir dépôt</button>
              </form>
            ) : (
              <form action={lockClientCollectionAction.bind(null, item.id)} className="flex flex-wrap gap-2">
                <input name="lockReason" defaultValue="Préparation TVA démarrée après readiness check." />
                <button className="btn"><LockKeyhole size={16} /> Verrouiller dépôt</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-extrabold">Blocages</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {readiness.blockingIssues.map((issue) => <div key={issue} className="rounded-md border border-red-200 bg-red-50 p-3 font-bold text-red-900">{issue}</div>)}
            {!readiness.blockingIssues.length ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-900">Aucun blocage readiness.</div> : null}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-extrabold">Alertes</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {readiness.warningIssues.map((issue) => <div key={issue} className="rounded-md border border-amber-200 bg-amber-50 p-3 font-bold text-amber-900">{issue}</div>)}
            {!readiness.warningIssues.length ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-900">Aucune alerte.</div> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">TVA ventes</div>
          <div className="mt-2 text-2xl font-black">{formatMad(readiness.summary.salesTVA)}</div>
          <div className="text-xs text-muted">HT {formatMad(readiness.summary.salesHT)} / TTC {formatMad(readiness.summary.salesTTC)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">TVA déductible</div>
          <div className="mt-2 text-2xl font-black">{formatMad(readiness.summary.purchaseTVA)}</div>
          <div className="text-xs text-muted">HT {formatMad(readiness.summary.purchaseHT)} / TTC {formatMad(readiness.summary.purchaseTTC)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">TVA nette estimée</div>
          <div className="mt-2 text-2xl font-black">{formatMad(readiness.summary.netTVA)}</div>
          <div className="text-xs text-muted">Avoirs : {formatMad(readiness.summary.creditNoteTVA)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Qualité saisie</div>
          <div className="mt-2 text-2xl font-black">{readiness.summary.entriesCount}</div>
          <div className="text-xs text-muted">{readiness.summary.entriesMissingInvoiceNumber} sans numéro, {readiness.summary.suspiciousEntries} suspecte(s)</div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-extrabold">Ajouter une entrée TVA manuelle</h2>
        <form action={createTvaAmountEntryAction.bind(null, item.id)} className="grid gap-4">
          <div className="field-grid">
            <label>
              Type
              <select name="type" defaultValue={TvaAmountEntryType.PURCHASE}>
                {Object.values(TvaAmountEntryType).map((type) => <option key={type} value={type}>{typeLabel[type]}</option>)}
              </select>
            </label>
            <label>Facture<input name="invoiceNumber" placeholder="FAC-001" /></label>
            <label>Date facture<input name="invoiceDate" type="date" /></label>
            <label>Fournisseur / client<input name="supplierOrCustomerName" /></label>
            <label>Montant HT<input name="amountHT" type="number" step="0.01" defaultValue="0" /></label>
            <label>Montant TVA<input name="amountTVA" type="number" step="0.01" defaultValue="0" /></label>
            <label>Montant TTC<input name="amountTTC" type="number" step="0.01" defaultValue="0" /></label>
            <label>Taux TVA %<input name="tvaRate" type="number" step="0.01" defaultValue="20" /></label>
            <label>
              Document lié
              <select name="uploadedDocumentId" defaultValue="">
                <option value="">Aucun document</option>
                {item.uploadedDocuments.map((document) => (
                  <option key={document.id} value={document.id}>{document.originalFileName}</option>
                ))}
              </select>
            </label>
          </div>
          <label>Notes<textarea name="notes" rows={2} /></label>
          <button className="btn btn-primary w-fit"><FilePlus2 size={16} /> Ajouter entrée TVA</button>
        </form>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Entrées TVA saisies</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Facture</th>
                <th>Date</th>
                <th>Tiers</th>
                <th>HT</th>
                <th>TVA</th>
                <th>TTC</th>
                <th>Taux</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {item.tvaAmountEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{typeLabel[entry.type]}</td>
                  <td>{entry.invoiceNumber || "-"}</td>
                  <td>{formatDate(entry.invoiceDate)}</td>
                  <td>{entry.supplierOrCustomerName || "-"}</td>
                  <td>{formatMad(Number(entry.amountHT))}</td>
                  <td>{formatMad(Number(entry.amountTVA))}</td>
                  <td>{formatMad(Number(entry.amountTTC))}</td>
                  <td>{moneyValue(entry.tvaRate)}%</td>
                  <td>{entry.uploadedDocument?.originalFileName || "-"}</td>
                </tr>
              ))}
              {!item.tvaAmountEntries.length ? <tr><td colSpan={9} className="text-muted">Aucune entrée TVA saisie.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-extrabold">Historique readiness checks</h2>
        <div className="mt-3 grid gap-2">
          {item.tvaReadinessChecks.map((check) => (
            <div key={check.id} className="rounded-md border border-border p-3 text-sm">
              <div className="font-extrabold">{readinessStatusLabel(check.status)} - risque {fiscalSeverityLabel(check.riskLevel)}</div>
              <div className="text-muted">{formatDate(check.generatedAt)} - {check.missingDocumentsCount} manquant(s), {check.unreviewedDocumentsCount} à vérifier, {check.rejectedDocumentsCount} rejeté(s)</div>
            </div>
          ))}
          {!item.tvaReadinessChecks.length ? <div className="text-sm text-muted">Aucun check sauvegardé. Changez le statut préparation pour enregistrer un snapshot.</div> : null}
        </div>
      </section>
    </div>
  );
}
