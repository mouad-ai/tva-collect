"use server";

import {
  BillingPaymentMethod,
  FirmStatus,
  InvoiceStatus,
  OperationalActorType,
  PaymentProofStatus,
  SubscriptionStatus,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireFirmAnyRole } from "@/lib/auth";
import { canAccessBilling } from "@/lib/security-policy";
import {
  ensureFirmSubscription,
  getPlanByCode,
  markInvoicePaid,
  nextInvoiceNumber,
  syncBillingLifecycle
} from "@/lib/billing";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload, validateUpload } from "@/lib/storage";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

function paymentMethodValue(value: string | null) {
  return value && Object.values(BillingPaymentMethod).includes(value as BillingPaymentMethod)
    ? (value as BillingPaymentMethod)
    : BillingPaymentMethod.BANK_TRANSFER;
}

async function requireBillingUser() {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (!canAccessBilling(user.role)) redirect("/app");
  return user;
}

export async function createBillingInvoiceAction(formData: FormData) {
  const admin = await requireAdmin();
  const firmId = text(formData, "firmId");
  const amountMad = Number(text(formData, "amountMad"));
  const dueDate = dateValue(formData, "dueDate");
  const issueNow = text(formData, "issueNow") === "on";
  if (!firmId || !Number.isFinite(amountMad) || amountMad <= 0 || !dueDate) {
    redirect("/admin/invoices?error=invalid");
  }

  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) redirect("/admin/invoices?error=firm");

  const subscription = await ensureFirmSubscription(firmId, firm.plan, {
    trialEndsAt: firm.trialEndDate,
    status: firm.status
  });

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tx);
    return tx.billingInvoice.create({
      data: {
        firmId,
        subscriptionId: subscription.id,
        invoiceNumber,
        status: issueNow ? InvoiceStatus.UNPAID : InvoiceStatus.DRAFT,
        amountMad: Math.round(amountMad),
        dueDate,
        notes: text(formData, "notes"),
        createdByUserId: admin.id
      }
    });
  });

  await recordOperationalEvent({
    firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_INVOICE_CREATED",
    eventTitle: "Facture créée",
    eventDescription: `${invoice.invoiceNumber} — ${invoice.amountMad} MAD`,
    metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    source: "ADMIN_BILLING"
  });

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");
  revalidatePath(`/admin/firms/${firmId}/billing`);
  revalidatePath("/app/billing");
  redirect(`/admin/firms/${firmId}/billing?created=${invoice.id}`);
}

export async function issueBillingInvoiceAction(invoiceId: string, _formData?: FormData) {
  const admin = await requireAdmin();
  const invoice = await prisma.billingInvoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.UNPAID }
  });
  await recordOperationalEvent({
    firmId: invoice.firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_INVOICE_ISSUED",
    eventTitle: "Facture émise",
    eventDescription: invoice.invoiceNumber,
    metadata: { invoiceId: invoice.id },
    source: "ADMIN_BILLING"
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/firms/${invoice.firmId}/billing`);
  revalidatePath("/app/billing");
}

export async function markBillingInvoicePaidAction(invoiceId: string, formData: FormData) {
  const admin = await requireAdmin();
  const paymentMethod = paymentMethodValue(text(formData, "paymentMethod"));
  const reference = text(formData, "reference");
  const adminComment = text(formData, "adminComment");
  const invoice = await markInvoicePaid({
    invoiceId,
    adminUserId: admin.id,
    paymentMethod,
    reference,
    adminComment
  });
  await recordOperationalEvent({
    firmId: invoice.firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_INVOICE_PAID",
    eventTitle: "Facture marquée payée",
    eventDescription: invoice.invoiceNumber,
    metadata: { invoiceId: invoice.id, paymentMethod, reference },
    source: "ADMIN_BILLING"
  });
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");
  revalidatePath(`/admin/firms/${invoice.firmId}/billing`);
  revalidatePath("/app/billing");
  redirect(`/admin/firms/${invoice.firmId}/billing?paid=${invoice.id}`);
}

export async function rejectPaymentProofAction(proofId: string, formData: FormData) {
  const admin = await requireAdmin();
  const adminComment = text(formData, "adminComment") || "Preuve rejetée. Merci de renvoyer un justificatif lisible.";
  const proof = await prisma.paymentProof.update({
    where: { id: proofId },
    data: {
      status: PaymentProofStatus.REJECTED,
      reviewedByUserId: admin.id,
      reviewedAt: new Date(),
      adminComment
    },
    include: { invoice: true }
  });
  await prisma.billingInvoice.update({
    where: { id: proof.invoiceId },
    data: { status: InvoiceStatus.UNPAID }
  });
  await recordOperationalEvent({
    firmId: proof.firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_PROOF_REJECTED",
    eventTitle: "Preuve de paiement rejetée",
    eventDescription: proof.invoice.invoiceNumber,
    metadata: { proofId: proof.id, invoiceId: proof.invoiceId },
    source: "ADMIN_BILLING"
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/firms/${proof.firmId}/billing`);
  revalidatePath("/app/billing");
}

export async function submitPaymentProofAction(invoiceId: string, formData: FormData) {
  const user = await requireBillingUser();
  const invoice = await prisma.billingInvoice.findFirst({
    where: { id: invoiceId, firmId: user.firmId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE] } }
  });
  if (!invoice) redirect("/app/billing?error=invoice");

  const method = paymentMethodValue(text(formData, "method"));
  const reference = text(formData, "reference");
  const amountMad = Number(text(formData, "amountMad") || invoice.amountMad);
  const file = formData.get("proofFile");

  let fileMeta: { originalFileName: string; storageKey: string; mimeType: string; size: number } | null = null;
  if (file instanceof File && file.size > 0) {
    const uploadError = await validateUpload(file);
    if (uploadError) redirect("/app/billing?error=file");
    const saved = await saveLocalUpload(file, `billing-proofs/${user.firmId}`);
    fileMeta = {
      originalFileName: file.name,
      storageKey: saved.storageKey,
      mimeType: file.type || "application/octet-stream",
      size: saved.size
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentProof.create({
      data: {
        firmId: user.firmId,
        invoiceId: invoice.id,
        originalFileName: fileMeta?.originalFileName,
        storageKey: fileMeta?.storageKey,
        mimeType: fileMeta?.mimeType,
        size: fileMeta?.size,
        amountMad: Number.isFinite(amountMad) ? Math.round(amountMad) : invoice.amountMad,
        method,
        reference,
        status: PaymentProofStatus.SUBMITTED,
        submittedByUserId: user.id
      }
    });
    await tx.billingInvoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.PAYMENT_PROOF_SUBMITTED }
    });
  });

  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_PROOF_SUBMITTED",
    eventTitle: "Preuve de paiement soumise",
    eventDescription: invoice.invoiceNumber,
    metadata: { invoiceId: invoice.id, method, reference },
    source: "APP_BILLING"
  });

  revalidatePath("/app/billing");
  revalidatePath("/admin/invoices");
  redirect("/app/billing?submitted=1");
}

export async function changeFirmSubscriptionPlanAction(firmId: string, formData: FormData) {
  const admin = await requireAdmin();
  const planCode = text(formData, "plan") || "STARTER";
  const plan = await getPlanByCode(planCode);
  if (!plan) redirect(`/admin/firms/${firmId}/billing?error=plan`);

  const firm = await prisma.firm.update({
    where: { id: firmId },
    data: { plan: plan.code }
  });
  const subscription = await ensureFirmSubscription(firmId, plan.code, {
    trialEndsAt: firm.trialEndDate,
    status: firm.status
  });
  await prisma.firmSubscription.update({
    where: { id: subscription.id },
    data: { planId: plan.id }
  });

  await recordOperationalEvent({
    firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_PLAN_CHANGED",
    eventTitle: "Plan abonnement modifié",
    eventDescription: plan.name,
    metadata: { planCode: plan.code },
    source: "ADMIN_BILLING"
  });

  revalidatePath(`/admin/firms/${firmId}/billing`);
  revalidatePath("/app/billing");
  redirect(`/admin/firms/${firmId}/billing?plan=${plan.code}`);
}

export async function extendFirmTrialAction(firmId: string, formData: FormData) {
  const admin = await requireAdmin();
  const trialEndDate = dateValue(formData, "trialEndDate");
  if (!trialEndDate) redirect(`/admin/firms/${firmId}/billing?error=trial`);

  await prisma.firm.update({
    where: { id: firmId },
    data: { trialEndDate, status: FirmStatus.TRIAL }
  });
  const subscription = await prisma.firmSubscription.findFirst({
    where: { firmId },
    orderBy: { createdAt: "desc" }
  });
  if (subscription) {
    await prisma.firmSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: trialEndDate,
        currentPeriodEnd: trialEndDate,
        suspendedAt: null
      }
    });
  }

  await recordOperationalEvent({
    firmId,
    actorUserId: admin.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_TRIAL_EXTENDED",
    eventTitle: "Essai prolongé",
    eventDescription: trialEndDate.toISOString(),
    source: "ADMIN_BILLING"
  });

  revalidatePath(`/admin/firms/${firmId}/billing`);
  revalidatePath("/app/billing");
  redirect(`/admin/firms/${firmId}/billing?trial=extended`);
}

export async function updatePlatformBillingSettingsAction(formData: FormData) {
  await requireAdmin();
  await prisma.platformBillingSettings.upsert({
    where: { id: "default" },
    update: {
      bankName: text(formData, "bankName"),
      accountHolder: text(formData, "accountHolder"),
      rib: text(formData, "rib"),
      iban: text(formData, "iban"),
      paymentInstructions: text(formData, "paymentInstructions"),
      supportEmail: text(formData, "supportEmail"),
      supportWhatsapp: text(formData, "supportWhatsapp")
    },
    create: {
      id: "default",
      bankName: text(formData, "bankName"),
      accountHolder: text(formData, "accountHolder"),
      rib: text(formData, "rib"),
      iban: text(formData, "iban"),
      paymentInstructions: text(formData, "paymentInstructions"),
      supportEmail: text(formData, "supportEmail"),
      supportWhatsapp: text(formData, "supportWhatsapp")
    }
  });
  revalidatePath("/admin/billing");
  revalidatePath("/app/billing");
}

export async function syncFirmBillingLifecycleAction(firmId: string) {
  await syncBillingLifecycle(firmId);
  revalidatePath("/app/billing");
  revalidatePath(`/admin/firms/${firmId}/billing`);
}

export async function requestBillingUpgradeAction(formData: FormData) {
  const user = await requireBillingUser();
  const targetPlan = text(formData, "targetPlan") || "PRO";
  const message = text(formData, "message");
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "BILLING_UPGRADE_REQUESTED",
    eventTitle: "Demande d'upgrade",
    eventDescription: message || `Demande de passage au plan ${targetPlan}.`,
    metadata: { targetPlan },
    source: "APP_BILLING"
  });
  redirect("/app/billing?upgrade=sent");
}
