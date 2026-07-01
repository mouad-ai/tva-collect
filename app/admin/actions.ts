"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auditEvent } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { ensureDefaultPlans } from "@/lib/billing";
import { defaultRequiredDocuments } from "@/lib/constants";
import { createUserInvite } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createFirmWithOwnerAction(formData: FormData) {
  const admin = await requireAdmin();
  await ensureDefaultPlans();
  const firmName = text(formData, "firmName");
  const ownerName = text(formData, "ownerName");
  const ownerEmail = text(formData, "ownerEmail")?.toLowerCase();
  const planCode = text(formData, "plan") || "STARTER";
  if (!firmName || !ownerName || !ownerEmail) return;

  const trialStartDate = text(formData, "trialStartsAt") ? new Date(String(text(formData, "trialStartsAt"))) : new Date();
  const trialEndDate = text(formData, "trialEndsAt")
    ? new Date(String(text(formData, "trialEndsAt")))
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUniqueOrThrow({ where: { code: planCode } });
    const firm = await tx.firm.create({
      data: {
        name: firmName,
        city: text(formData, "city"),
        phone: text(formData, "phone"),
        email: text(formData, "email"),
        plan: plan.code,
        status: "TRIAL",
        trialStartDate,
        trialEndDate,
        defaultRequiredDocuments
      }
    });
    const owner = await tx.user.create({
      data: {
        firmId: firm.id,
        name: ownerName,
        email: ownerEmail,
        role: "OWNER",
        isActive: false,
        passwordHash: null
      }
    });
    await tx.firmSubscription.create({
      data: {
        firmId: firm.id,
        planId: plan.id,
        status: "TRIALING",
        startedAt: trialStartDate,
        trialEndsAt: trialEndDate,
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate
      }
    });
    return { firm, owner };
  });

  await auditEvent({ action: "firm.created", firmId: result.firm.id, userId: admin.id, entityType: "Firm", entityId: result.firm.id, metadata: { ownerEmail, planCode } });
  const invite = await createUserInvite({
    firmId: result.firm.id,
    email: ownerEmail,
    name: ownerName,
    role: UserRole.OWNER,
    createdByUserId: admin.id
  });
  await auditEvent({ action: "owner.invited", firmId: result.firm.id, userId: admin.id, entityType: "User", entityId: result.owner.id });

  const tokenParam = process.env.NODE_ENV !== "production" ? `?invite=${encodeURIComponent(invite.token)}` : "";
  redirect(`/admin/firms/new${tokenParam}`);
}

export async function markInvoicePaidAction(invoiceId: string) {
  const admin = await requireAdmin();
  const invoice = await prisma.billingInvoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date(), paymentMethod: "OTHER" }
  });
  await auditEvent({ action: "invoice.marked_paid", firmId: invoice.firmId, userId: admin.id, entityType: "BillingInvoice", entityId: invoice.id });
}
