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
    super("Le module facturation n'est pas initialise. Executez: npx prisma migrate deploy && npx prisma generate, puis redemarrez le serveur.");
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
    name: "Essentiel",
    monthlyPriceMad: 119,
    monthlyPriceUsd: 12,
    yearlyPriceUsd: 120,
    clientLimit: 20,
    userLimit: 1,
    storageLimitMb: 2048,
    activeCollectionLimit: 1,
    hasZipExport: false,
    hasAdvancedReports: false,
    hasWhiteLabel: false,
    hasWorkflowBuilder: false,
    lemonMonthlyVariantId: process.env.LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID || null,
    lemonYearlyVariantId: process.env.LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID || null,
    isActive: true
  },
  {
    id: "plan_pro",
    code: "PRO",
    name: "Professionnel",
    monthlyPriceMad: 249,
    monthlyPriceUsd: 25,
    yearlyPriceUsd: 250,
    clientLimit: 75,
    userLimit: 3,
    storageLimitMb: 10240,
    activeCollectionLimit: null,
    hasZipExport: true,
    hasAdvancedReports: true,
    hasWhiteLabel: false,
    hasWorkflowBuilder: false,
    lemonMonthlyVariantId: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID || null,
    lemonYearlyVariantId: process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID || null,
    isActive: true
  },
  {
    id: "plan_premium",
    code: "PREMIUM",
    name: "Cabinet Plus",
    monthlyPriceMad: 449,
    monthlyPriceUsd: 45,
    yearlyPriceUsd: 450,
    clientLimit: 200,
    userLimit: 8,
    storageLimitMb: 51200,
    activeCollectionLimit: null,
    hasZipExport: true,
    hasAdvancedReports: true,
    hasWhiteLabel: true,
    hasWorkflowBuilder: true,
    lemonMonthlyVariantId: process.env.LEMONSQUEEZY_PREMIUM_MONTHLY_VARIANT_ID || null,
    lemonYearlyVariantId: process.env.LEMONSQUEEZY_PREMIUM_YEARLY_VARIANT_ID || null,
    isActive: true
  }
];

export function invoiceStatusLabel(status: InvoiceStatus | string) {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    ISSUED: "Emise",
    UNPAID: "Impayee",
    PAYMENT_PROOF_SUBMITTED: "Preuve soumise",
    PAID: "Payee",
    OVERDUE: "En retard",
    CANCELLED: "Annulee"
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
    TRIAL: "Essai",
    ACTIVE: "Actif",
    PAST_DUE: "Paiement en retard",
    OVERDUE: "Paiement en retard",
    UNPAID: "Impayee",
    SUSPENDED: "Suspendu",
    CANCELLED_BUT_ACTIVE: "Annule - actif jusqu'a fin periode",
    CANCELLED: "Annule",
    EXPIRED: "Expire"
  };
  return labels[String(status)] || String(status);
}

export function billingPaymentMethodLabel(method: BillingPaymentMethod | string) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "Virement bancaire",
    CASH: "Especes",
    CHEQUE: "Cheque",
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
        monthlyPriceUsd: plan.monthlyPriceUsd,
        yearlyPriceUsd: plan.yearlyPriceUsd,
        clientLimit: plan.clientLimit,
        userLimit: plan.userLimit,
        storageLimitMb: plan.storageLimitMb,
        activeCollectionLimit: plan.activeCollectionLimit,
        hasZipExport: plan.hasZipExport,
        hasAdvancedReports: plan.hasAdvancedReports,
        hasWhiteLabel: plan.hasWhiteLabel,
        hasWorkflowBuilder: plan.hasWorkflowBuilder,
        lemonMonthlyVariantId: plan.lemonMonthlyVariantId,
        lemonYearlyVariantId: plan.lemonYearlyVariantId,
        isActive: plan.isActive
      },
      create: plan
    });
  }
}

export async function ensureDefaultPlans() {
  return ensureSubscriptionPlans();
}

export async function getPlatformBillingSettings() {
  await ensureSubscriptionPlans();
  return prisma.platformBillingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      bankName: process.env.BILLING_BANK_NAME || "Paiement gere par Lemon Squeezy",
      accountHolder: process.env.BILLING_ACCOUNT_HOLDER || "TVA Collect",
      rib: process.env.BILLING_RIB || null,
      iban: process.env.BILLING_IBAN || null,
      paymentInstructions: process.env.BILLING_INSTRUCTIONS || "Les paiements, factures et recus sont geres par Lemon Squeezy.",
      supportEmail: process.env.BILLING_SUPPORT_EMAIL || "support@tvacollect.ma",
      supportWhatsapp: process.env.BILLING_SUPPORT_WHATSAPP || null
    }
  });
}

export async function getPlanByCode(code: string) {
  await ensureSubscriptionPlans();
  return prisma.subscriptionPlan.findFirst({
    where: { code: code.toUpperCase(), isActive: true }
  });
}

export async function ensureFirmSubscription(
  firmId: string,
  planCode: string,
  options?: { trialEndsAt?: Date | null; status?: FirmStatus; provider?: string; tx?: Prisma.TransactionClient }
) {
  const db = options?.tx || prisma;
  const plan = await getPlanByCode(planCode);
  if (!plan) throw new Error(`Plan ${planCode} introuvable.`);

  const existing = await db.firmSubscription.findUnique({ where: { firmId } });
  if (existing) return existing;

  const now = new Date();
  const trialEndsAt = options?.trialEndsAt ?? addMonths(now, 1);
  const isTrial = options?.status === FirmStatus.TRIAL || !options?.status;
  const periodEnd = isTrial ? trialEndsAt : addMonths(now, 1);

  // This bootstraps a baseline subscription row for firm creation, manual
  // invoicing, admin plan changes, and lifecycle sync — none of which is the
  // actual Lemon Squeezy checkout/webhook path (that path upserts its own
  // FirmSubscription directly in lib/lemonsqueezy.ts and always sets
  // provider: "LEMON_SQUEEZY" itself). So a firm bootstrapped here has not
  // gone through Lemon Squeezy and should default to "MANUAL".
  return db.firmSubscription.create({
    data: {
      firmId,
      planId: plan.id,
      provider: options?.provider || "MANUAL",
      status: isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
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
  return prisma.firmSubscription.findUnique({
    where: { firmId },
    include: { plan: true }
  });
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

  if ((subscription.status === SubscriptionStatus.TRIAL || subscription.status === SubscriptionStatus.TRIALING) && subscription.trialEndsAt && subscription.trialEndsAt < now) {
    await prisma.firmSubscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.OVERDUE } });
    if (firm.status === FirmStatus.TRIAL || firm.status === FirmStatus.ACTIVE) {
      await prisma.firm.update({ where: { id: firmId }, data: { status: FirmStatus.OVERDUE } });
    }
  }
}

export function planHasFeature(plan: SubscriptionPlan | null | undefined, feature: PlanFeature) {
  if (!plan) return false;
  if (feature === "ZIP_EXPORT") return plan.hasZipExport;
  if (feature === "ADVANCED_REPORTS") return plan.hasAdvancedReports;
  if (feature === "WHITE_LABEL") return plan.hasWhiteLabel;
  if (feature === "WORKFLOW_BUILDER") return plan.hasWorkflowBuilder;
  return false;
}

/**
 * Has this firm ever actually paid — through Lemon Squeezy checkout, or via
 * the manual bank-transfer flow (a BillingInvoice marked PAID)?
 *
 * Used to tell an expired free trial apart from a real customer whose card
 * merely failed this month: both land in OVERDUE, but only one of them should
 * keep write access while it gets sorted out.
 */
async function hasEverPaid(firmId: string, lemonSubscriptionId: string | null | undefined) {
  if (lemonSubscriptionId) return true;
  const paidInvoices = await prisma.billingInvoice.count({ where: { firmId, status: InvoiceStatus.PAID } });
  return paidInvoices > 0;
}

export type WriteAccessFacts = {
  subscriptionStatus: SubscriptionStatus | null;
  everPaid: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  now: Date;
};

/**
 * Decides whether a firm may still perform *write* operations (new clients,
 * new users, new collection periods). Reads — viewing and downloading
 * documents already collected — are deliberately never blocked here: these
 * are TVA files tied to legal deadlines, and locking a cabinet out of its own
 * documents would do real harm. An expired account goes read-only, not dark.
 *
 * The statuses allowed by requireActiveSubscription include OVERDUE/PAST_DUE
 * so a customer whose card just failed keeps working. That same leniency,
 * without the rules below, meant an expired *free trial* also sat in OVERDUE
 * with full access forever — nothing but a manual admin suspension ever moved
 * a firm to SUSPENDED, so the 30-day trial never actually ended.
 *
 * Deliberately date-driven rather than status-driven, so correctness does not
 * depend on syncBillingLifecycle having run — there is no scheduled job to
 * forget to set up.
 */
export function writeAccessDenial(facts: WriteAccessFacts): { code: string; message: string } | null {
  // An explicitly ACTIVE (or cancelled-but-still-inside-the-paid-period)
  // subscription is trusted as-is; this also covers firms an admin activated
  // by hand on the manual bank-transfer flow.
  if (facts.subscriptionStatus === SubscriptionStatus.ACTIVE || facts.subscriptionStatus === SubscriptionStatus.CANCELLED_BUT_ACTIVE) {
    return null;
  }

  if (facts.everPaid) {
    // Real customer behind on payment: grace window past the period end.
    if (!facts.currentPeriodEnd) return null;
    const graceEndsAt = new Date(facts.currentPeriodEnd.getTime() + BILLING_SUSPENSION_DAYS * 24 * 60 * 60 * 1000);
    if (graceEndsAt < facts.now) {
      return { code: "PAYMENT_OVERDUE", message: "Paiement en retard. Régularisez l'abonnement pour continuer à créer des collectes." };
    }
    return null;
  }

  // Never paid: write access lasts exactly as long as the trial does.
  if (facts.trialEndsAt && facts.trialEndsAt < facts.now) {
    return {
      code: "TRIAL_EXPIRED",
      message: "Votre essai gratuit est terminé. Choisissez un plan pour continuer à créer des collectes et des clients."
    };
  }
  return null;
}

export async function requireActiveSubscription(firmId: string, now = new Date()) {
  const snapshot = await getFirmBillingSnapshot(firmId);
  const allowedFirmStatuses: FirmStatus[] = [FirmStatus.TRIAL, FirmStatus.ACTIVE, FirmStatus.OVERDUE, FirmStatus.CANCELLED_BUT_ACTIVE];
  const allowedSubscriptionStatuses: SubscriptionStatus[] = [
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.OVERDUE,
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.CANCELLED_BUT_ACTIVE
  ];
  const allowedFirm = allowedFirmStatuses.includes(snapshot.firm.status);
  const allowedSubscription = !snapshot.subscription || allowedSubscriptionStatuses.includes(snapshot.subscription.status);
  if (!allowedFirm || !allowedSubscription) {
    throw new BillingEnforcementError("SUBSCRIPTION_INACTIVE", "Abonnement inactif ou suspendu.");
  }

  const subscription = snapshot.subscription;
  const denial = writeAccessDenial({
    subscriptionStatus: subscription?.status ?? null,
    everPaid: await hasEverPaid(firmId, subscription?.lemonSubscriptionId),
    trialEndsAt: subscription?.trialEndsAt ?? snapshot.firm.trialEndDate ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    now
  });
  if (denial) throw new BillingEnforcementError(denial.code, denial.message);
}

export async function requirePlanFeature(firmId: string, feature: PlanFeature) {
  if (!billingSchemaReady()) return;
  await requireActiveSubscription(firmId);
  const snapshot = await getFirmBillingSnapshot(firmId);
  if (!planHasFeature(snapshot.plan, feature)) {
    throw new BillingEnforcementError("PLAN_FEATURE", "Cette fonctionnalite necessite un plan superieur.");
  }
}

export async function requireWithinLimit(firmId: string, limit: PlanLimit) {
  if (!billingSchemaReady()) return;
  await requireActiveSubscription(firmId);
  const snapshot = await getFirmBillingSnapshot(firmId);
  const plan = snapshot.plan;
  const usage = snapshot.usage;
  if (!plan) throw new BillingEnforcementError("PLAN_MISSING", "Aucun plan actif n'est configure pour ce cabinet.");

  if (limit === "CLIENTS" && plan.clientLimit != null && usage.clients >= plan.clientLimit) {
    throw new BillingEnforcementError("CLIENT_LIMIT", `Limite clients atteinte (${plan.clientLimit}).`);
  }
  if (limit === "USERS" && plan.userLimit != null && usage.users >= plan.userLimit) {
    throw new BillingEnforcementError("USER_LIMIT", `Limite utilisateurs atteinte (${plan.userLimit}).`);
  }
  if (limit === "ACTIVE_COLLECTIONS" && plan.activeCollectionLimit != null && usage.activeCollections >= plan.activeCollectionLimit) {
    throw new BillingEnforcementError("COLLECTION_LIMIT", `Limite de collectes actives atteinte (${plan.activeCollectionLimit}).`);
  }
  if (limit === "STORAGE" && plan.storageLimitMb != null && usage.storageBytes >= plan.storageLimitMb * 1024 * 1024) {
    throw new BillingEnforcementError("STORAGE_LIMIT", `Limite de stockage atteinte (${plan.storageLimitMb} Mo).`);
  }
}

export async function requireWithinPlanLimit(firmId: string, limit: Lowercase<PlanLimit> | PlanLimit) {
  return requireWithinLimit(firmId, limit.toUpperCase() as PlanLimit);
}

export function usagePercent(used: number, limit: number | null | undefined) {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export type FirmUsage = Awaited<ReturnType<typeof getFirmUsage>>;

/**
 * Detects a firm sitting ABOVE its current plan's limits — this happens when
 * a plan is downgraded (via Lemon Squeezy webhook or an admin plan change)
 * while the firm already has more clients/users/storage than the new plan
 * allows. We deliberately never delete or disable anything to get a firm
 * back under its limit — that would destroy client data over a billing
 * event. requireWithinLimit() already stops the firm from growing further;
 * this just makes the over-limit state visible so the firm/admin can act on
 * it (upgrade, or manually reduce usage).
 */
export function overLimitReasons(plan: SubscriptionPlan | null | undefined, usage: FirmUsage): string[] {
  if (!plan) return [];
  const reasons: string[] = [];
  if (plan.clientLimit != null && usage.clients > plan.clientLimit) {
    reasons.push(`Clients : ${usage.clients} / ${plan.clientLimit}`);
  }
  if (plan.userLimit != null && usage.users > plan.userLimit) {
    reasons.push(`Utilisateurs : ${usage.users} / ${plan.userLimit}`);
  }
  if (plan.activeCollectionLimit != null && usage.activeCollections > plan.activeCollectionLimit) {
    reasons.push(`Collectes actives : ${usage.activeCollections} / ${plan.activeCollectionLimit}`);
  }
  if (plan.storageLimitMb != null && usage.storageBytes > plan.storageLimitMb * 1024 * 1024) {
    reasons.push(`Stockage : ${formatBytesShort(usage.storageBytes)} / ${plan.storageLimitMb} Mo`);
  }
  return reasons;
}

function formatBytesShort(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
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

    if (invoice.subscriptionId) {
      await tx.firmSubscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE, suspendedAt: null }
      });
    }
    await tx.firm.update({
      where: { id: invoice.firmId },
      data: { status: FirmStatus.ACTIVE, suspendedAt: null, suspendedReason: null, cancelledAt: null }
    });
    return invoice;
  });
}
