import { ArrowLeft, Save } from "lucide-react";
import { ClientTvaFrequency, FiscalSeverity } from "@prisma/client";
import Link from "next/link";
import { updateClientFiscalProfileAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { fiscalSeverityLabel, tvaFrequencyLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function missingFiscalFields(
  profile: { ice?: string | null; identifiantFiscal?: string | null; tvaFrequency?: ClientTvaFrequency | null; tvaRegimeId?: string | null } | null,
  client: { ice: string | null; taxId: string | null }
) {
  const missing = [];
  if (!(profile?.ice || client.ice)) missing.push("ICE");
  if (!(profile?.identifiantFiscal || client.taxId)) missing.push("IF");
  if (!profile?.tvaFrequency) missing.push("Fréquence TVA");
  if (!profile?.tvaRegimeId) missing.push("Régime TVA");
  return missing;
}

export const metadata = { title: "Profil fiscal" };

export default async function ClientFiscalProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const [client, profile, regimes, users] = await Promise.all([
    prisma.client.findFirst({ where: { id, firmId: user.firmId } }),
    prisma.clientFiscalProfile.findUnique({ where: { clientId: id } }),
    prisma.fiscalRegime.findMany({ where: { firmId: user.firmId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { firmId: user.firmId }, orderBy: { name: "asc" } })
  ]);

  if (!client) {
    return <div className="card p-6">Client introuvable.</div>;
  }

  const missing = missingFiscalFields(profile, client);

  return (
    <div className="content-stack">
      <div>
        <Link href={`/app/clients/${client.id}`} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft size={15} /> {client.companyName}</Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Profil fiscal client</h1>
        <p className="text-sm text-muted">Identifiants fiscaux, régime TVA, fréquence, risque fiscal et responsable dossier.</p>
      </div>

      {missing.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-extrabold">Profil fiscal incomplet</div>
          <div className="mt-1">Éléments manquants : {missing.join(", ")}.</div>
        </section>
      ) : (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          Profil fiscal complet pour les informations principales.
        </section>
      )}

      <section className="card p-4">
        <form action={updateClientFiscalProfileAction.bind(null, client.id)} className="grid gap-4">
          <div className="field-grid">
            <label>ICE<input name="ice" defaultValue={profile?.ice || client.ice || ""} /></label>
            <label>Identifiant fiscal<input name="identifiantFiscal" defaultValue={profile?.identifiantFiscal || client.taxId || ""} /></label>
            <label>Registre commerce<input name="registreCommerce" defaultValue={profile?.registreCommerce || ""} /></label>
            <label>Numéro CNSS<input name="cnssNumber" defaultValue={profile?.cnssNumber || ""} /></label>
            <label>
              Fréquence TVA
              <select name="tvaFrequency" defaultValue={profile?.tvaFrequency || ClientTvaFrequency.MONTHLY}>
                {Object.values(ClientTvaFrequency).map((frequency) => (
                  <option key={frequency} value={frequency}>{tvaFrequencyLabel(frequency)}</option>
                ))}
              </select>
            </label>
            <label>
              Régime fiscal
              <select name="tvaRegimeId" defaultValue={profile?.tvaRegimeId || ""}>
                <option value="">Aucun régime</option>
                {regimes.map((regime) => (
                  <option key={regime.id} value={regime.id}>{regime.name}</option>
                ))}
              </select>
            </label>
            <label>Jour de déclaration spécifique<input name="declarationDayOverride" type="number" min={1} max={31} defaultValue={profile?.declarationDayOverride || ""} /></label>
            <label>Jour de paiement spécifique<input name="paymentDayOverride" type="number" min={1} max={31} defaultValue={profile?.paymentDayOverride || ""} /></label>
            <label>
              Risque fiscal
              <select name="fiscalRiskLevel" defaultValue={profile?.fiscalRiskLevel || FiscalSeverity.LOW}>
                {Object.values(FiscalSeverity).map((risk) => (
                  <option key={risk} value={risk}>{fiscalSeverityLabel(risk)}</option>
                ))}
              </select>
            </label>
            <label>
              Comptable assigné
              <select name="assignedAccountantId" defaultValue={profile?.assignedAccountantId || ""}>
                <option value="">Non assigné</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label>Notes fiscales<textarea name="notes" rows={4} defaultValue={profile?.notes || ""} /></label>
          <button className="btn btn-primary w-fit"><Save size={16} /> Enregistrer profil fiscal</button>
        </form>
      </section>
    </div>
  );
}
