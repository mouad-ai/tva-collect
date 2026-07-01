import { ArrowLeft, Save } from "lucide-react";
import { ClientTvaFrequency, FiscalSeverity } from "@prisma/client";
import Link from "next/link";
import { updateClientFiscalProfileAction } from "@/app/actions";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const frequencyLabel: Record<ClientTvaFrequency, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  EXEMPT: "Exonere",
  CUSTOM: "Personnalisee"
};

const riskLabel: Record<FiscalSeverity, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
  CRITICAL: "Critique"
};

function missingFiscalFields(
  profile: { ice?: string | null; identifiantFiscal?: string | null; tvaFrequency?: ClientTvaFrequency | null; tvaRegimeId?: string | null } | null,
  client: { ice: string | null; taxId: string | null }
) {
  const missing = [];
  if (!(profile?.ice || client.ice)) missing.push("ICE");
  if (!(profile?.identifiantFiscal || client.taxId)) missing.push("IF");
  if (!profile?.tvaFrequency) missing.push("Frequence TVA");
  if (!profile?.tvaRegimeId) missing.push("Regime TVA");
  return missing;
}

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
        <p className="text-sm text-muted">Identifiants fiscaux, regime TVA, frequence, risque fiscal et responsable dossier.</p>
      </div>

      {missing.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-extrabold">Profil fiscal incomplet</div>
          <div className="mt-1">Elements manquants: {missing.join(", ")}.</div>
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
            <label>Numero CNSS<input name="cnssNumber" defaultValue={profile?.cnssNumber || ""} /></label>
            <label>
              Frequence TVA
              <select name="tvaFrequency" defaultValue={profile?.tvaFrequency || ClientTvaFrequency.MONTHLY}>
                {Object.values(ClientTvaFrequency).map((frequency) => (
                  <option key={frequency} value={frequency}>{frequencyLabel[frequency]}</option>
                ))}
              </select>
            </label>
            <label>
              Regime fiscal
              <select name="tvaRegimeId" defaultValue={profile?.tvaRegimeId || ""}>
                <option value="">Aucun regime</option>
                {regimes.map((regime) => (
                  <option key={regime.id} value={regime.id}>{regime.name}</option>
                ))}
              </select>
            </label>
            <label>Jour declaration specifique<input name="declarationDayOverride" type="number" min={1} max={31} defaultValue={profile?.declarationDayOverride || ""} /></label>
            <label>Jour paiement specifique<input name="paymentDayOverride" type="number" min={1} max={31} defaultValue={profile?.paymentDayOverride || ""} /></label>
            <label>
              Risque fiscal
              <select name="fiscalRiskLevel" defaultValue={profile?.fiscalRiskLevel || FiscalSeverity.LOW}>
                {Object.values(FiscalSeverity).map((risk) => (
                  <option key={risk} value={risk}>{riskLabel[risk]}</option>
                ))}
              </select>
            </label>
            <label>
              Comptable assigne
              <select name="assignedAccountantId" defaultValue={profile?.assignedAccountantId || ""}>
                <option value="">Non assigne</option>
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
