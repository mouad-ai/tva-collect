import { ArrowLeft, BadgePercent, Landmark, Plus, Save } from "lucide-react";
import { FiscalFrequency } from "@prisma/client";
import Link from "next/link";
import { createFiscalRegimeAction, createTvaRateAction, updateFiscalConfigAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const frequencyLabel: Record<FiscalFrequency, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  YEARLY: "Annuelle",
  CUSTOM: "Personnalisée"
};

function percentValue(value: unknown) {
  return value == null ? "" : String(value);
}

export default async function FiscalConfigPage() {
  const user = await requireFirmUser();
  const [config, rates, regimes] = await Promise.all([
    prisma.fiscalConfig.findUnique({ where: { firmId: user.firmId } }),
    prisma.tvaRate.findMany({ where: { firmId: user.firmId }, orderBy: [{ isDefault: "desc" }, { rate: "desc" }] }),
    prisma.fiscalRegime.findMany({ where: { firmId: user.firmId }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] })
  ]);

  return (
    <div className="content-stack">
      <div>
        <Link href="/app/settings" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> Paramètres</Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Configuration fiscale</h1>
        <p className="text-sm text-muted">Règles TVA du cabinet : pays, devise, fréquence, échéances, taux et régimes.</p>
      </div>

      <section className="card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Landmark size={18} />
          <h2 className="font-extrabold">Règles TVA par défaut</h2>
        </div>
        <form action={updateFiscalConfigAction} className="grid gap-4">
          <div className="field-grid">
            <label>Pays fiscal<input name="countryCode" defaultValue={config?.countryCode || "MA"} /></label>
            <label>Devise<input name="defaultCurrency" defaultValue={config?.defaultCurrency || "MAD"} /></label>
            <label>
              Fréquence TVA par défaut
              <select name="defaultTvaFrequency" defaultValue={config?.defaultTvaFrequency || FiscalFrequency.MONTHLY}>
                {Object.values(FiscalFrequency).map((frequency) => (
                  <option key={frequency} value={frequency}>{frequencyLabel[frequency]}</option>
                ))}
              </select>
            </label>
            <label>Jour déclaration<input name="defaultDeclarationDay" type="number" min={1} max={31} defaultValue={config?.defaultDeclarationDay || 20} /></label>
            <label>Jour paiement<input name="defaultPaymentDay" type="number" min={1} max={31} defaultValue={config?.defaultPaymentDay || 25} /></label>
          </div>
          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer fiscal</button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            <BadgePercent size={18} />
            <h2 className="font-extrabold">Taux TVA</h2>
          </div>
          <form action={createTvaRateAction} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <label>Libellé<input name="label" placeholder="TVA normale" required /></label>
              <label>Taux %<input name="rate" type="number" step="0.01" min={0} placeholder="20" required /></label>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold"><input name="isDefault" type="checkbox" /> Taux par défaut</label>
            <button className="btn w-fit"><Plus size={16} /> Ajouter taux</button>
          </form>
          <div className="mt-4 grid gap-2">
            {rates.map((rate) => (
              <div key={rate.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <div className="font-extrabold">{rate.label}</div>
                  <div className="text-muted">{percentValue(rate.rate)}% {rate.isDefault ? "- taux par défaut" : ""}</div>
                </div>
                <span className={rate.isActive ? "font-bold text-emerald-700" : "font-bold text-slate-400"}>{rate.isActive ? "Actif" : "Inactif"}</span>
              </div>
            ))}
            {!rates.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Aucun taux TVA configuré.</div> : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-4 font-extrabold">Régimes fiscaux</h2>
          <form action={createFiscalRegimeAction} className="grid gap-3">
            <label>Nom du régime<input name="name" placeholder="TVA mensuelle standard" required /></label>
            <label>
              Fréquence
              <select name="frequency" defaultValue={FiscalFrequency.MONTHLY}>
                {Object.values(FiscalFrequency).map((frequency) => (
                  <option key={frequency} value={frequency}>{frequencyLabel[frequency]}</option>
                ))}
              </select>
            </label>
            <label>Description<textarea name="description" rows={3} placeholder="Régime utilisé pour les clients déclarant la TVA chaque mois." /></label>
            <button className="btn w-fit"><Plus size={16} /> Ajouter regime</button>
          </form>
          <div className="mt-4 grid gap-2">
            {regimes.map((regime) => (
              <div key={regime.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-extrabold">{regime.name}</div>
                  <span className="font-bold text-muted">{frequencyLabel[regime.frequency]}</span>
                </div>
                <div className="mt-1 text-muted">{regime.description || "Aucune description."}</div>
              </div>
            ))}
            {!regimes.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Aucun régime fiscal configuré.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

