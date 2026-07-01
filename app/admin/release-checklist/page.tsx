import { CheckCircle2, Circle, Save, TriangleAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ReleaseChecklistStatus } from "@prisma/client";
import { updateReleaseChecklistItemAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sections = [
  {
    title: "Configuration technique",
    items: [
      { key: "tech.env", label: "Variables .env configurees" },
      { key: "tech.migrations", label: "Migrations Prisma appliquees" },
      { key: "tech.build", label: "Build production valide" },
      { key: "tech.storage", label: "Stockage uploads configure" },
      { key: "tech.upload-limits", label: "Limites upload verifiees" },
      { key: "tech.legal-pages", label: "Pages conditions/confidentialite presentes" }
    ]
  },
  {
    title: "Flux cabinet",
    items: [
      { key: "cabinet.login", label: "Connexion demo fonctionne" },
      { key: "cabinet.client", label: "Creation/import client teste" },
      { key: "cabinet.collection", label: "Creation collecte TVA testee" },
      { key: "cabinet.upload-link", label: "Copie lien dépôt testee" },
      { key: "cabinet.document-review", label: "Verification document testee" },
      { key: "cabinet.reminder", label: "Relance WhatsApp/email manuelle testee" }
    ]
  },
  {
    title: "Flux TVA",
    items: [
      { key: "tva.readiness", label: "Préparation TVA calculee" },
      { key: "tva.amounts", label: "Saisie montants TVA testee" },
      { key: "tva.csv", label: "Export CSV TVA teste" },
      { key: "tva.filing", label: "Dossier declaration cree" },
      { key: "tva.payment", label: "Paiement TVA sauvegarde" },
      { key: "tva.evidence", label: "Audit/preuves fiscales verifies" }
    ]
  },
  {
    title: "Securite et release",
    items: [
      { key: "security.tenant-isolation", label: "Isolation cabinet verifiee sur les pages critiques" },
      { key: "security.closed-upload", label: "Lien public bloque si collecte fermee" },
      { key: "security.locked-upload", label: "Lien public bloque si période verrouillee" },
      { key: "security.document-download", label: "Telechargement document protege" },
      { key: "security.admin-tracking", label: "Admin peut suivre cabinets/leads/evenements" },
      { key: "security.backup-doc", label: "Sauvegarde base et uploads documentee" }
    ]
  },
  {
    title: "Blocages production",
    items: [
      { key: "blocker.admin", label: "ADMIN SaaS créé avec mot de passe fort et firmId nul" },
      { key: "blocker.provisioning", label: "ADMIN créé cabinet + propriétaire depuis /admin/firms/new" },
      { key: "blocker.team", label: "Propriétaire invite responsables, assistants et lecture seule" },
      { key: "blocker.rbac", label: "RBAC valide pour admin, owner, manager, assistant et lecture seule" },
      { key: "blocker.session-expiry", label: "Expiration de session active" },
      { key: "blocker.rate-limit", label: "Rate limiting login et upload public actif" },
      { key: "blocker.upload-expiry", label: "Expiration des liens de dépôt active" },
      { key: "blocker.suspended", label: "Cabinet suspendu/annule bloque dans l'app et le dépôt public" },
      { key: "blocker.tenant-tests", label: "Tests d'isolation tenant passes" },
      { key: "blocker.trash", label: "Corbeille et restauration testees" },
      { key: "blocker.health", label: "Endpoint /api/health sain" },
      { key: "blocker.backup-drill", label: "Strategie backup/restore testee" }
    ]
  },
  {
    title: "Variables production",
    items: [
      { key: "env.node", label: "NODE_ENV=production" },
      { key: "env.database", label: "DATABASE_URL production configure" },
      { key: "env.secret", label: "AUTH_SECRET/NEXTAUTH_SECRET long et unique" },
      { key: "env.url", label: "APP_URL/NEXTAUTH_URL domaine production" },
      { key: "env.storage", label: "UPLOAD_STORAGE=s3 avec S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY" },
      { key: "env.email", label: "EMAIL_PROVIDER=smtp avec SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD" },
      { key: "env.admin-email", label: "ADMIN_EMAIL configure" },
      { key: "env.no-demo-secret", label: "Aucun secret demo ou mot de passe password123" }
    ]
  }
];

const statusLabels: Record<ReleaseChecklistStatus, string> = {
  TODO: "À vérifier",
  PASSED: "Valide",
  FAILED: "Echec",
  BLOCKED: "Bloque"
};

const statusStyles: Record<ReleaseChecklistStatus, string> = {
  TODO: "border-slate-200 bg-slate-50 text-slate-700",
  PASSED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
  BLOCKED: "border-amber-200 bg-amber-50 text-amber-900"
};

const statusIcons: Record<ReleaseChecklistStatus, ReactNode> = {
  TODO: <Circle size={16} />,
  PASSED: <CheckCircle2 size={16} />,
  FAILED: <XCircle size={16} />,
  BLOCKED: <TriangleAlert size={16} />
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "Jamais";
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function ReleaseChecklistPage() {
  await requireAdmin();
  const [firms, clients, collections, documents, filingCases, readinessChecks, events, savedItems] = await Promise.all([
    prisma.firm.count(),
    prisma.client.count(),
    prisma.collectionPeriod.count(),
    prisma.uploadedDocument.count(),
    prisma.tvaFilingCase.count(),
    prisma.tvaReadinessCheck.count(),
    prisma.operationalEvent.count(),
    prisma.releaseChecklistItem.findMany({ include: { checkedByUser: { select: { name: true, email: true } } } })
  ]);

  const savedByKey = new Map(savedItems.map((item) => [item.key, item]));
  const allItems = sections.flatMap((section) => section.items);
  const counts = allItems.reduce(
    (acc, item) => {
      const status = savedByKey.get(item.key)?.status || ReleaseChecklistStatus.TODO;
      acc[status] += 1;
      return acc;
    },
    {
      TODO: 0,
      PASSED: 0,
      FAILED: 0,
      BLOCKED: 0
    } satisfies Record<ReleaseChecklistStatus, number>
  );
  const lastCheckedAt = savedItems.reduce<Date | null>((latest, item) => {
    if (!item.checkedAt) return latest;
    return !latest || item.checkedAt > latest ? item.checkedAt : latest;
  }, null);

  const readinessSignals = [
    { label: "Firmes", value: firms },
    { label: "Clients", value: clients },
    { label: "Collectes", value: collections },
    { label: "Documents", value: documents },
    { label: "Declarations TVA", value: filingCases },
    { label: "Contrôles preparation", value: readinessChecks },
    { label: "Événements audit", value: events }
  ];

  return (
    <div className="grid gap-6">
      <div className="page-header">
        <div>
          <h1>Checklist de recette</h1>
          <p>Verification sauvegardee avant pilote ou production.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">Progression</div>
          <div className="mt-2 text-3xl font-black">{counts.PASSED}/{allItems.length}</div>
          <p className="mt-1 text-xs font-bold text-muted">Derniere verification: {formatDate(lastCheckedAt)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${statusStyles.PASSED}`}>
          <div className="text-sm font-bold">Valides</div>
          <div className="mt-2 text-3xl font-black">{counts.PASSED}</div>
        </div>
        <div className={`rounded-lg border p-4 ${statusStyles.BLOCKED}`}>
          <div className="text-sm font-bold">Bloques</div>
          <div className="mt-2 text-3xl font-black">{counts.BLOCKED}</div>
        </div>
        <div className={`rounded-lg border p-4 ${statusStyles.FAILED}`}>
          <div className="text-sm font-bold">Echecs</div>
          <div className="mt-2 text-3xl font-black">{counts.FAILED}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {readinessSignals.map((signal) => (
          <div key={signal.label} className="card p-4">
            <div className="text-sm font-bold text-muted">{signal.label}</div>
            <div className="mt-2 text-3xl font-black">{signal.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-black">Recette sauvegardee, pas automatique</div>
            <p className="mt-1">
              Cette page garde les decisions de recette dans la base. Les commandes techniques restent a lancer cote serveur:
              <span className="ml-1 font-mono">npm run release:check</span>, <span className="font-mono">npm test</span> et{" "}
              <span className="font-mono">npm run smoke:functional</span>.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {sections.map((section) => (
          <div key={section.title} className="card p-4">
            <h2 className="font-black">{section.title}</h2>
            <div className="mt-4 grid gap-3">
              {section.items.map((item) => {
                const saved = savedByKey.get(item.key);
                const status = saved?.status || ReleaseChecklistStatus.TODO;
                return (
                  <form key={item.key} action={updateReleaseChecklistItemAction} className={`rounded-lg border p-3 ${statusStyles[status]}`}>
                    <input type="hidden" name="key" value={item.key} />
                    <div className="grid gap-3 lg:grid-cols-[1fr_180px_1.5fr_auto] lg:items-start">
                      <div className="flex gap-3">
                        <span className="mt-1 shrink-0">{statusIcons[status]}</span>
                        <div>
                          <div className="font-black">{item.label}</div>
                          <div className="mt-1 text-xs font-bold opacity-80">
                            {statusLabels[status]} - {saved?.checkedByUser?.name || saved?.checkedByUser?.email || "non verifie"} - {formatDate(saved?.checkedAt)}
                          </div>
                        </div>
                      </div>
                      <label className="grid gap-1 text-xs font-bold">
                        Statut
                        <select name="status" defaultValue={status} className="input bg-white">
                          {Object.values(ReleaseChecklistStatus).map((value) => (
                            <option key={value} value={value}>{statusLabels[value]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold">
                        Note / preuve
                        <textarea
                          name="notes"
                          defaultValue={saved?.notes || ""}
                          rows={2}
                          placeholder="Ex: npm run smoke:functional passe le 30/06, test upload mobile OK..."
                          className="input min-h-20 bg-white"
                        />
                      </label>
                      <button className="btn btn-primary h-10 self-end">
                        <Save size={16} /> Sauver
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-black">Definition de fini</div>
            <p className="mt-1">
              Le produit est pret pour pilote quand tous les blocages production sont valides, sans echec ouvert, et que le flux complet connexion, clients,
              collecte, dépôt mobile, verification, relance, preparation TVA, declaration, export et usage admin passe sans intervention technique.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
