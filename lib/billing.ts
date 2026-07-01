import {
  BillingPaymentMethod,
  FirmStatus,
  InvoiceStatus,
  PaymentProofStatus,
  Prisma,
  SubscriptionStatus,
  type SubscriptionPlan
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanFeature = "ZIP_EXPORT" | "ADVANCED_REPORTS" | "WHITE_LABEL" | "WORKFLOW_BUILDER";
export type PlanLimit = "CLIENTS" | "USERS" | "ACTIVE_COLLECTIONS" | "STORAGE";

export const BILLING_GRACE_WARNING_DAYS = 7;
export const BILLING_SUSPENSION_DAYS = 15;

export class BillingEnforcementError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class BillingSchemaUnavailableError extends Error {
  constructor() {
    super("Le module facturation n'est pas initialisé. Exécutez: npx prisma migrate deploy && npx prisma generate, puis redémarrez le serveur.");
  }
}

function billingSchemaReady() {
  const client = prisma as unknown as {
    subscriptionPlan?: { upsert: unknown };
    platformBillingSettings?: { upsert: unknown };
    firmSubscription?: { findFirst: unknown };
    billingInvoice?: { findMany: unknown };
  };
  return Boolean(
    client.subscriptionPlan?.upsert &&
      client.platformBillingSettings?.upsert &&
      client.firmSubscription?.findFirst &&
      client.billingInvoice?.findMany
  );
}

export function assertBillingSchemaReady() {
  if (!billingSchemaReady()) throw new BillingSchemaUnavailableError();
}

const defaultPlans: Array<Omit<SubscriptionPlan, "createdAt" | "updatedAt">> = [
  {
    id: "plan_starter",
    code: "STARTER",
    name: "Démarrage",
    monthlyPriceMad: 999,
    clientLimit: 30,
    userLimit: 1,
    storageLimitMb: 5120,
    activeCollectionLimit: 1,
    hasZipExport: false,
    hasAdvancedReports: false,
    hasWhiteLabel: false,
    hasWorkflowBuilder: false,
    isActive: true
  },
  {
    id: "plan_pro",
    code: "PRO",
    name: "Pro",
    monthlyPriceMad: 1999,
    clientLimit: 100,
    userLimit: 3,
    storageLimitMb: 20480,
    activeCollectionLimit: null,
    hasZipExport: true,
    hasAdvancedReports: true,
    hasWhiteLabel: false,
    hasWorkflowBuilder: false,
    isActive: true
  },
  {
    id: "plan_premium",
    code: "PREMIUM",
    name: "Premium",
    monthlyPriceMad: 4999,
    clientLimit: null,
    userLimit: null,
    storageLimitMb: null,
    activeCollectionLimit: null,
    hasZipExport: true,
    hasAdvancedReports: true,
    hasWhiteLabel: true,
    hasWorkflowBuilder: true,
    isActive: true
  }
];

export function invoiceStatusLabel(status: InvoiceStatus | string) {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    ISSUED: "Émise",
    UNPAID: "Impayée",
    PAYMENT_PROOF_SUBMITTED: "Preuve soumise",
    PAID: "Payée",
    OVERDUE: "En retard",
    CANCELLED: "Annulée"
  };
  return labels[String(status)] || String(status);
}

export function invoiceStatusTone(status: InvoiceStatus | string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "PAYMENT_PROOF_SUBMITTED") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "OVERDUE" || status === "UNPAID") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function subscriptionStatusLabel(status: SubscriptionStatus | string) {
  const labels: Record<string, string> = {
    TRIALING: "Essai",
    ACTIVE: "Actif",
    PAST_DUE: "Paiement en retard",
    SUSPENDED: "Suspendu",
    CANCELLED: "Annulé"
  };
  return labels[String(status)] || String(status);
}

export function billingPaymentMethodLabel(method: BillingPaymentMethod | string) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "Virement bancaire",
    CASH: "Espèces",
    CHEQUE: "Chèque",
    ONLINE_CARD: "Carte en ligne",
    OTHER: "Autre"
  };
  return labels[String(method)] || String(method);
}

export function formatMad(amount: number) {
  return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(amount);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function daysBetween(from: Date, to: Date) {
  return Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

export async function ensureSubscriptionPlans() {
  assertBillingSchemaReady();
  for (const plan of defaultPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPriceMad: plan.monthlyPriceMad,
        clientLimit: plan.clientLimit,
        userLimit: plan.userLimit,
        storageLimitMb: plan.storageLimitMb,
        activeCollectionLimit: plan.activeCollectionLimit,
        hasZipExport: plan.hasZipExport,
        hasAdvancedReports: plan.hasAdvancedReports,
        hasWhiteLabel: plan.hasWhiteLabel,
        hasWorkflowBuilder: plan.hasWorkflowBuilder,
        isActive: plan.isActive
      },
      create: plan
    });
  }
}

export async function getPlatformBillingSettings() {
  await ensureSubscriptionPlans();
  return prisma.platformBillingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      bankName: process.env.BILLING_BANK_NAME || "Banque à configurer",
      accountHolder: process.env.BILLING_ACCOUNT_HOLDER || "TVA Collect SARL",
      rib: process.env.BILLING_RIB || "000000000000000000000000",
      iban: process.env.BILLING_IBAN || null,
      paymentInstructions: process.env.BILLING_INSTRUCTIONS || "Merci d'effectuer le virement en indiquant la référence facture dans le libellé.",
      supportEmail: process.env.BILLING_SUPPORT_EMAIL || "billing@tvacollect.ma",
      supportWhatsapp: process.env.BILLING_SUPPORT_WHATSAPP || "+212 600 00 00 00"
    }
  });
}

export async function getPlanByCode(code: string) {
  await ensureSubscriptionPlans();
  const normalized = code.toUpperCase();
  return prisma.subscriptionPlan.findFirst({
    where: { code: normalized, isActive: true }
  });
}

export async function ensureFirmSubscription(
  firmId: string,
  planCode: string,
  options?: { trialEndsAt?: Date | null; status?: FirmStatus; tx?: Prisma.TransactionClient }
) {
  const db = options?.tx || prisma;
  const plan = await getPlanByCode(planCode);
  if (!plan) throw new Error(`Plan ${planCode} introuvable.`);

  const existing = await db.firmSubscription.findFirst({
    where: { firmId, status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] } },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;

  const now = new Date();
  const trialEndsAt = options?.trialEndsAt ?? addMonths(now, 1);
  const isTrial = options?.status === FirmStatus.TRIAL || !options?.status;
  const periodEnd = isTrial ? trialEndsAt : addMonths(now, 1);

  return db.firmSubscription.create({
    data: {
      firmId,
      planId: plan.id,
      status: isTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      startedAt: now,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    },
    include: { plan: true }
  });
}

export async function getActiveFirmSubscription(firmId: string) {
  await ensureSubscriptionPlans();
  return prisma.firmSubscription.findFirst({
    where: {
      firmId,
      status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED] }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getFirmBillingSnapshot(firmId: string) {
  const [firm, subscription, settings, usage] = await Promise.all([
    prisma.firm.findUnique({ where: { id: firmId } }),
    getActiveFirmSubscription(firmId),
    getPlatformBillingSettings(),
    getFirmUsage(firmId)
  ]);
  if (!firm) throw new Error("Cabinet introuvable.");
  const plan = subscription?.plan || (await getPlanByCode(firm.plan));
  return { firm, subscription, plan, settings, usage };
}

export async function getFirmUsage(firmId: string) {
  const [clients, users, activeCollections, documents] = await Promise.all([
    prisma.client.count({ where: { firmId, deletedAt: null } }),
    prisma.user.count({ where: { firmId, isActive: true, role: { not: "ADMIN" } } }),
    prisma.collectionPeriod.count({ where: { firmId, deletedAt: null, status: "ACTIVE" } }),
    prisma.uploadedDocument.findMany({ where: { firmId, deletedAt: null }, select: { size: true } })
  ]);
  const storageBytes = documents.reduce((sum, document) => sum + document.size, 0);
  return { clients, users, activeCollections, storageBytes, files: documents.length };
}

export async function nextInvoiceNumber(tx: Prisma.TransactionClient = prisma) {
  const year = new Date().getFullYear();
  const prefix = `TVA-${year}-`;
  const latest = await tx.billingInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true }
  });
  const sequence = latest ? Number(latest.invoiceNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function nextReceiptNumber(tx: Prisma.TransactionClient = prisma) {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const latest = await tx.billingReceipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true }
  });
  const sequence = latest ? Number(latest.receiptNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function syncBillingLifecycle(firmId: string, now = new Date()) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm || firm.status === FirmStatus.CANCELLED) return;

  const subscription = await getActiveFirmSubscription(firmId);
  if (!subscription) {
    await ensureFirmSubscription(firmId, firm.plan, { trialEndsAt: firm.trialEndDate, status: firm.status });
    return syncBillingLifecycle(firmId, now);
  }

  const openInvoices = await prisma.billingInvoice.findMany({
    where: {
      firmId,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.ISSUED, InvoiceStatus.PAYMENT_PROOF_SUBMITTED, InvoiceStatus.OVERDUE] }
    },
    orderBy: { dueDate: "asc" }
  });

  for (const invoice of openInvoices) {
    const overdueDays = -daysBetween(now, invoice.dueDate);
    if (overdueDays > 0 && invoice.status !== InvoiceStatus.PAYMENT_PROOF_SUBMITTED) {
      await prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.OVERDUE }
      });
    }
    if (overdueDays >= BILLING_SUSPENSION_DAYS && firm.status !== FirmStatus.SUSPENDED) {
      await prisma.firm.update({
        where: { id: firmId },
        data: {
          status: FirmStatus.SUSPENDED,
          suspendedAt: now,
          suspendedReason: "Suspension automatique pour facture impayée au-delà de 15 jours."
        }
      });
      await prisma.firmSubscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.SUSPENDED, suspendedAt: now }
      });
    } else if (overdueDays >= BILLING_GRACE_WARNING_DAYS && firm.status === FirmStatus.ACTIVE) {
      await prisma.firm.update({ where: { id: firmId }, data: { status: FirmStatus.OVERDUE } });
      await prisma.firmSubscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE }
      });
    }
  }

  if (
    subscription.status === SubscriptionStatus.TRIALING &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt < now &&
    !openInvoices.some((invoice) => invoice.status === InvoiceStatus.PAID)
  ) {
    await prisma.firmSubscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE }
    });
    if (firm.status === FirmStatus.TRIAL || firm.status === FirmStatus.ACTIVE) {
      await prisma.firm.update({ where: { id: firmId }, data: { status: FirmStatus.OVERDUE } });
    }
  }
}

function planHasFeature(plan: SubscriptionPlan | null | undefined, feature: PlanFeature) {
  if (!plan) return false;
  if (feature === "ZIP_EXPORT") return plan.hasZipExport;
  if (feature === "ADVANCED_REPORTS") return plan.hasAdvancedReports;
  if (feature === "WHITE_LABEL") return plan.hasWhiteLabel;
  if (feature === "WORKFLOW_BUILDER") return plan.hasWorkflowBuilder;
  return false;
}

export async function requirePlanFeature(firmId: string, feature: PlanFeature) {
  if (!billingSchemaReady()) return;
  const snapshot = await getFirmBillingSnapshot(firmId);
  if (!planHasFeature(snapshot.plan, feature)) {
    throw new BillingEnforcementError(
      "PLAN_FEATURE",
      "Cette fonctionnalité nécessite un plan supérieur. Contactez la facturation pour upgrader."
    );
  }
}

export async function requireWithinLimit(firmId: string, limit: PlanLimit) {
  if (!billingSchemaReady()) return;
  const snapshot = await getFirmBillingSnapshot(firmId);
  const plan = snapshot.plan;
  const usage = snapshot.usage;
  if (!plan) throw new BillingEnforcementError("PLAN_MISSING", "Aucun plan actif n'est configuré pour ce cabinet.");

  if (limit === "CLIENTS" && plan.clientLimit != null && usage.clients >= plan.clientLimit) {
    throw new BillingEnforcementError("CLIENT_LIMIT", `Limite clients atteinte (${plan.clientLimit}). Passez au plan Pro pour continuer.`);
  }
  if (limit === "USERS" && plan.userLimit != null && usage.users >= plan.userLimit) {
    throw new BillingEnforcementError("USER_LIMIT", `Limite utilisateurs atteinte (${plan.userLimit}).`);
  }
  if (limit === "ACTIVE_COLLECTIONS" && plan.activeCollectionLimit != null && usage.activeCollections >= plan.activeCollectionLimit) {
    throw new BillingEnforcementError("COLLECTION_LIMIT", `Limite de collectes actives atteinte (${plan.activeCollectionLimit}).`);
  }
  if (limit === "STORAGE" && plan.storageLimitMb != null) {
    const limitBytes = plan.storageLimitMb * 1024 * 1024;
    if (usage.storageBytes >= limitBytes) {
      throw new BillingEnforcementError("STORAGE_LIMIT", `Limite de stockage atteinte (${plan.storageLimitMb} Mo).`);
    }
  }
}

export function usagePercent(used: number, limit: number | null | undefined) {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  adminUserId: string;
  paymentMethod: BillingPaymentMethod;
  reference?: string | null;
  adminComment?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.billingInvoice.findUnique({
      where: { id: input.invoiceId },
      include: { firm: true, subscription: { include: { plan: true } } }
    });
    if (!invoice) throw new Error("Facture introuvable.");
    const paidAt = new Date();
    await tx.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt,
        paymentMethod: input.paymentMethod,
        notes: input.adminComment || invoice.notes
      }
    });
    await tx.paymentProof.updateMany({
      where: { invoiceId: invoice.id, status: PaymentProofStatus.SUBMITTED },
      data: {
        status: PaymentProofStatus.ACCEPTED,
        reviewedByUserId: input.adminUserId,
        reviewedAt: paidAt,
        adminComment: input.adminComment
      }
    });
    const receiptNumber = await nextReceiptNumber(tx);
    await tx.billingReceipt.upsert({
      where: { invoiceId: invoice.id },
      update: {
        amountMad: invoice.amountMad,
        paymentMethod: input.paymentMethod,
        paidAt,
        reference: input.reference || undefined
      },
      create: {
        firmId: invoice.firmId,
        invoiceId: invoice.id,
        receiptNumber,
        amountMad: invoice.amountMad,
        paymentMethod: input.paymentMethod,
        paidAt,
        reference: input.reference || undefined
      }
    });

    const periodStart = paidAt;
    const periodEnd = addMonths(paidAt, 1);
    if (invoice.subscriptionId) {
      await tx.firmSubscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          suspendedAt: null
        }
      });
    }
    await tx.firm.update({
      where: { id: invoice.firmId },
      data: {
        status: FirmStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
        cancelledAt: null
      }
    });
    return invoice;
  });
}
