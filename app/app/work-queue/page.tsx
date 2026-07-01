import { AlertTriangle, CheckCircle2, Clock, FileSearch, PhoneCall, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReminderButton } from "@/components/ReminderButton";
import { requireFirmUser } from "@/lib/auth";
import { buildClientComplianceProfile } from "@/lib/client-compliance";
import { buildOperationsPlan, type OperationRecommendation } from "@/lib/operations-brain";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const confidenceTone = {
  Low: "border-slate-200 bg-slate-50 text-slate-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-900",
  High: "border-orange-200 bg-orange-50 text-orange-900",
  Critical: "border-red-200 bg-red-50 text-red-800"
};

const confidenceLabel = {
  Low: "Faible",
  Medium: "Moyenne",
  High: "Forte",
  Critical: "Critique"
};

const actionIcon: Record<string, ReactNode> = {
  SEND_FIRST_REQUEST: <Send size={16} />,
  SEND_REMINDER: <Send size={16} />,
  SEND_URGENT_REMINDER: <Send size={16} />,
  CALL_CLIENT: <PhoneCall size={16} />,
  ESCALATE: <ShieldAlert size={16} />,
  REVIEW_DOCUMENT: <FileSearch size={16} />,
  REQUEST_REUPLOAD: <AlertTriangle size={16} />,
  CLOSE_DOSSIER: <CheckCircle2 size={16} />,
  WAIT: <Clock size={16} />
};

function MissionCard({ item }: { item: OperationRecommendation }) {
  const canRemind = ["SEND_FIRST_REQUEST", "SEND_REMINDER", "SEND_URGENT_REMINDER"].includes(item.actionType);
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={item.href} className="font-extrabold">{item.clientName}</Link>
          <div className="mt-1 text-sm text-muted">{item.collectionName}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", confidenceTone[item.confidence])}>
            {confidenceLabel[item.confidence]}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-black">P{item.priority}</span>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 font-bold">
        {actionIcon[item.actionType]}
        <span>{item.actionLabel}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{item.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span>{item.estimatedMinutes} min</span>
        <span>{item.missingCount} manquant(s)</span>
        <span>{item.pendingReviewCount} a verifier</span>
        <span>{item.invalidCount} invalide(s)</span>
        <span>{item.reminderCount} relance(s)</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canRemind ? <ReminderButton clientCollectionId={item.itemId} channel="WHATSAPP" /> : null}
        <Link href={item.href} className="btn">Ouvrir dossier</Link>
      </div>
    </div>
  );
}

function MissionSection({ title, items, empty }: { title: string; items: OperationRecommendation[]; empty: string }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-black">{title}</h2>
      <div className="grid gap-3">
        {items.map((item) => <MissionCard key={item.itemId} item={item} />)}
        {!items.length ? <p className="text-sm text-muted">{empty}</p> : null}
      </div>
    </div>
  );
}

export default async function WorkQueuePage() {
  const user = await requireFirmUser();
  const activeClientCollections = await prisma.clientCollection.findMany({
    where: { firmId: user.firmId, collectionPeriod: { status: "ACTIVE" } },
    include: {
      client: {
        include: {
          clientCollections: {
            include: {
              collectionPeriod: true,
              requiredDocuments: true,
              uploadedDocuments: true,
              reminderLogs: true
            }
          }
        }
      },
      collectionPeriod: true,
      requiredDocuments: true,
      uploadedDocuments: { orderBy: { createdAt: "asc" } },
      reminderLogs: { orderBy: { createdAt: "desc" } }
    },
    orderBy: [{ updatedAt: "asc" }],
    take: 250
  });

  const complianceScoresByClientId = new Map(
    activeClientCollections.map((item) => [
      item.clientId,
      buildClientComplianceProfile(item.client.clientCollections).score
    ])
  );
  const plan = buildOperationsPlan({ clientCollections: activeClientCollections, complianceScoresByClientId });
  const workloadHours = Math.floor(plan.totalMinutes / 60);
  const workloadMinutes = plan.totalMinutes % 60;
  const capacityHours = Math.floor(plan.dailyCapacityMinutes / 60);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Operations du jour</h1>
        <p className="text-sm text-muted">Plan quotidien calcule depuis les échéances, documents, relances et risques client.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <AlertTriangle size={16} />
            Cerveau operations
          </div>
          <h2 className="mt-2 text-xl font-black">Ce qui doit se passer aujourd&apos;hui</h2>
          <div className="mt-4 grid gap-2">
            {plan.recoveryActions.map((action, index) => (
              <div key={action} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{index + 1}</span>
                <span className="font-bold">{action}</span>
              </div>
            ))}
            {!plan.recoveryActions.length ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                Aucun risque opérationnel fort detecte aujourd&apos;hui.
              </div>
            ) : null}
          </div>
        </div>

        <div className={cn("rounded-lg border p-4", plan.overloadMinutes ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
          <div className="text-sm font-bold">Contrôle de charge reel</div>
          <div className="mt-2 text-3xl font-black">{workloadHours}h{String(workloadMinutes).padStart(2, "0")}</div>
          <p className="mt-1 text-sm">Capacite estimee: {capacityHours}h / jour.</p>
          {plan.overloadMinutes ? (
            <p className="mt-3 text-sm font-bold">Surcharge: {Math.ceil(plan.overloadMinutes / 60)}h. Reporter les actions faibles ou demander du renfort.</p>
          ) : (
            <p className="mt-3 text-sm font-bold">Mission realiste pour la journee.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border border-white/60 bg-white/60 p-3">
              <div className="font-extrabold">{plan.recommendations.length}</div>
              <div>actions</div>
            </div>
            <div className="rounded-md border border-white/60 bg-white/60 p-3">
              <div className="font-extrabold">{plan.critical}</div>
              <div>critiques</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <MissionSection title="Matin" items={plan.grouped.morning} empty="Aucune mission forte pour ce matin." />
        <MissionSection title="Apres-midi" items={plan.grouped.afternoon} empty="Aucune relance prioritaire pour l'apres-midi." />
        <MissionSection title="Avant de partir" items={plan.grouped.endOfDay} empty="Aucun dossier pret a clôturer." />
      </section>
    </div>
  );
}

