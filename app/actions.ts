"use server";

import {
  AuditResponseStatus,
  ClientTvaFrequency,
  CollectionStatus,
  DocumentQualityStatus,
  FiscalAuditCaseStatus,
  FiscalAuditCaseType,
  FiscalEvidenceRequestStatus,
  FiscalFrequency,
  FiscalSeverity,
  FirmStatus,
  OperationalActorType,
  Prisma,
  ReleaseChecklistStatus,
  RequiredDocumentStatus,
  TaxAuthorityNoticeStatus,
  TaxAuthorityNoticeType,
  TvaFilingStatus,
  TvaAmountEntryType,
  TvaPaymentMethod,
  TvaPaymentStatus,
  TvaPreparationStatus,
  TvaSubmissionStatus,
  UserRole,
  WorkflowType
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, requireFirmAnyRole, requireUser } from "@/lib/auth";
import { clientCompletionConfirmationText, clientUploadProofText, requiredDocumentsFromFirm, workflowTemplateFromType } from "@/lib/constants";
import { isRejectedQuality } from "@/lib/document-status";
import { sendDocumentRejectedEmail, sendInviteEmail, sendPasswordResetEmail } from "@/lib/email";
import { logServerError } from "@/lib/error-logging";
import { generateInviteToken, hashInviteToken, inviteExpiresAt, inviteUrl, passwordStrengthError } from "@/lib/invites";
import { recordOperationalEvent } from "@/lib/operational-events";
import { generatePasswordResetToken, hashPasswordResetToken, isPasswordResetUsable, passwordResetExpiresAt, passwordResetUrl } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { scanUploadedFile } from "@/lib/file-security";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { tvaFilingDeadlinesWithConfig } from "@/lib/tva-filing";
import { calculateTvaReadiness } from "@/lib/tva-readiness";
import { generateUploadToken, recalculateClientCollectionStatus, uploadTokenExpiryDate } from "@/lib/tva";
import { uploadUrl } from "@/lib/utils";
import { BillingEnforcementError, ensureFirmSubscription, getPlanByCode, requirePlanFeature, requireWithinLimit } from "@/lib/billing";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}

function boundedIntegerValue(formData: FormData, key: string, min: number, max: number, fallback: number | null = null) {
  const value = numberValue(formData, key);
  if (value == null || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

async function actionIp() {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

function requiredDocumentsForWorkflow(workflowType: WorkflowType, firmDefaultDocuments: unknown) {
  if (workflowType === WorkflowType.TVA_MONTHLY || workflowType === WorkflowType.TVA_QUARTERLY) {
    return requiredDocumentsFromFirm(firmDefaultDocuments);
  }
  return [...workflowTemplateFromType(workflowType).documents];
}

async function recordAdminAction(input: {
  firmId: string;
  actorUserId: string;
  eventType: string;
  eventTitle: string;
  eventDescription?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await recordOperationalEvent({
    firmId: input.firmId,
    actorUserId: input.actorUserId,
    actorType: OperationalActorType.USER,
    eventType: input.eventType,
    eventTitle: input.eventTitle,
    eventDescription: input.eventDescription,
    metadata: input.metadata,
    source: "ADMIN_ACCOUNT_PROVISIONING"
  });
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  await requireAdmin();
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage: text(formData, "stage") || "NEW",
      nextFollowUpAt: dateValue(formData, "nextFollowUpAt"),
      assignedOwner: text(formData, "assignedOwner"),
      expectedPlan: text(formData, "expectedPlan"),
      expectedSetupFee: numberValue(formData, "expectedSetupFee"),
      notes: text(formData, "notes")
    }
  });
  revalidatePath("/admin/leads");
}

export async function updateReleaseChecklistItemAction(formData: FormData) {
  const admin = await requireAdmin();
  const key = text(formData, "key");
  const statusValue = text(formData, "status") || ReleaseChecklistStatus.TODO;
  const status = Object.values(ReleaseChecklistStatus).includes(statusValue as ReleaseChecklistStatus)
    ? (statusValue as ReleaseChecklistStatus)
    : ReleaseChecklistStatus.TODO;
  if (!key) return;

  await prisma.releaseChecklistItem.upsert({
    where: { key },
    update: {
      status,
      notes: text(formData, "notes"),
      checkedByUserId: admin.id,
      checkedAt: new Date()
    },
    create: {
      key,
      status,
      notes: text(formData, "notes"),
      checkedByUserId: admin.id,
      checkedAt: new Date()
    }
  });
  revalidatePath("/admin/release-checklist");
}

function inviteRoleValue(value: string | null, allowed: UserRole[]) {
  const role = value && Object.values(UserRole).includes(value as UserRole) ? (value as UserRole) : null;
  return role && allowed.includes(role) ? role : null;
}

function firmStatusValue(value: string | null, fallback = FirmStatus.TRIAL) {
  return value && Object.values(FirmStatus).includes(value as FirmStatus) ? (value as FirmStatus) : fallback;
}

async function createInviteRecord(input: {
  firmId: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdByUserId: string;
}) {
  const { token, tokenHash } = generateInviteToken();
  const invite = await prisma.userInvite.create({
    data: {
      firmId: input.firmId,
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      tokenHash,
      expiresAt: inviteExpiresAt(),
      createdByUserId: input.createdByUserId
    }
  });
  return { invite, token };
}

export async function createFirmWithOwner(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  const ownerName = text(formData, "ownerName");
  const ownerEmail = text(formData, "ownerEmail")?.toLowerCase();
  if (!name || !ownerName || !ownerEmail) redirect("/admin/firms/new?error=missing");

  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingUser) redirect("/admin/firms/new?error=owner-email-exists");

  const { token } = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const firm = await prisma.$transaction(async (tx) => {
    const status = firmStatusValue(text(formData, "status"));
    const createdFirm = await tx.firm.create({
      data: {
        name,
        city: text(formData, "city"),
        phone: text(formData, "phone"),
        email: text(formData, "email"),
        status,
        plan: text(formData, "plan") || "STARTER",
        trialStartDate: dateValue(formData, "trialStartDate") || new Date(),
        trialEndDate: dateValue(formData, "trialEndDate"),
        suspendedAt: status === FirmStatus.SUSPENDED ? new Date() : null,
        cancelledAt: status === FirmStatus.CANCELLED ? new Date() : null
      }
    });
    await tx.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash: null,
        role: UserRole.OWNER,
        isActive: true,
        firmId: createdFirm.id
      }
    });
    await tx.userInvite.create({
      data: {
        firmId: createdFirm.id,
        email: ownerEmail,
        name: ownerName,
        role: UserRole.OWNER,
        tokenHash,
        expiresAt: inviteExpiresAt(),
        createdByUserId: admin.id
      }
    });
    return createdFirm;
  });

  await ensureFirmSubscription(firm.id, firm.plan, {
    trialEndsAt: firm.trialEndDate,
    status: firm.status
  });

  await sendInviteEmail({ to: ownerEmail, name: ownerName, firmName: firm.name, inviteLink: inviteUrl(token) });
  await recordAdminAction({
    firmId: firm.id,
    actorUserId: admin.id,
    eventType: "FIRM_CREATED",
    eventTitle: "Cabinet créé par admin SaaS",
    eventDescription: "Un cabinet et son propriétaire initial ont été crees.",
    metadata: { ownerEmail, plan: text(formData, "plan") || "STARTER", status: text(formData, "status") || FirmStatus.TRIAL }
  });
  await recordAdminAction({
    firmId: firm.id,
    actorUserId: admin.id,
    eventType: "OWNER_INVITED",
    eventTitle: "Invitation propriétaire",
    eventDescription: "Le lien de configuration du propriétaire a été créé.",
    metadata: { ownerEmail }
  });
  revalidatePath("/admin/firms");
  revalidatePath("/admin/users");
  revalidatePath("/admin/invites");
  redirect(`/admin/invites?created=${encodeURIComponent(token)}&firm=${encodeURIComponent(firm.id)}`);
}

export async function createOwnerInvite(firmId: string, ownerUserId: string) {
  const admin = await requireAdmin();
  const owner = await prisma.user.findFirst({ where: { id: ownerUserId, firmId, role: UserRole.OWNER }, include: { firm: true } });
  if (!owner) redirect(`/admin/firms/${firmId}?error=owner-not-found`);
  const { token } = await createInviteRecord({
    firmId,
    email: owner.email,
    name: owner.name,
    role: UserRole.OWNER,
    createdByUserId: admin.id
  });
  await sendInviteEmail({ to: owner.email, name: owner.name, firmName: owner.firm?.name || "TVA Collect", inviteLink: inviteUrl(token) });
  await recordAdminAction({
    firmId,
    actorUserId: admin.id,
    eventType: "PASSWORD_RESET_LINK_GENERATED",
    eventTitle: "Lien de configuration mot de passe généré",
    eventDescription: "Un lien de configuration/reinitialisation a été généré pour le propriétaire.",
    metadata: { ownerEmail: owner.email }
  });
  revalidatePath("/admin/invites");
  redirect(`/admin/invites?created=${encodeURIComponent(token)}&firm=${encodeURIComponent(firmId)}`);
}

export async function inviteFirmUser(formData: FormData) {
  const actor = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const email = text(formData, "email")?.toLowerCase();
  const role = inviteRoleValue(text(formData, "role"), [UserRole.MANAGER, UserRole.ASSISTANT, UserRole.READ_ONLY]);
  if (!email || !role) redirect("/app/settings/team?error=invalid-invite");
  try {
    await requireWithinLimit(actor.firmId, "USERS");
  } catch (error) {
    if (error instanceof BillingEnforcementError) redirect(`/app/settings/team?error=${error.code}`);
    throw error;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/app/settings/team?error=email-exists");

  await prisma.user.create({
    data: {
      name: text(formData, "name") || email,
      email,
      passwordHash: null,
      role,
      isActive: true,
      firmId: actor.firmId
    }
  });
  const { token } = await createInviteRecord({
    firmId: actor.firmId,
    email,
    name: text(formData, "name"),
    role,
    createdByUserId: actor.id
  });
  await sendInviteEmail({ to: email, name: text(formData, "name"), firmName: actor.firm.name, inviteLink: inviteUrl(token) });
  await recordOperationalEvent({
    firmId: actor.firmId,
    actorUserId: actor.id,
    actorType: OperationalActorType.USER,
    eventType: "TEAM_INVITE_CREATED",
    eventTitle: "Invitation équipe créée",
    eventDescription: `Invitation ${role} créée pour ${email}.`,
    metadata: { email, role },
    source: "APP_TEAM_SETTINGS"
  });
  revalidatePath("/app/settings/team");
  redirect(`/app/settings/team?created=${encodeURIComponent(token)}`);
}

export async function acceptInviteAndSetPassword(token: string, formData: FormData) {
  const password = text(formData, "password") || "";
  const confirmPassword = text(formData, "confirmPassword") || "";
  if (password !== confirmPassword) redirect(`/invite/${token}?error=mismatch`);
  const strengthError = passwordStrengthError(password);
  if (strengthError) redirect(`/invite/${token}?error=weak`);

  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { firm: true }
  });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) redirect(`/invite/${token}?error=invalid`);
  const user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!user || user.firmId !== invite.firmId || user.role !== invite.role) redirect(`/invite/${token}?error=invalid`);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        passwordChangedAt: new Date(),
        isActive: true,
        disabledAt: null,
        disabledReason: null
      }
    }),
    prisma.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    })
  ]);
  await recordOperationalEvent({
    firmId: invite.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "INVITE_ACCEPTED",
    eventTitle: "Invitation acceptee",
    eventDescription: `${user.email} a configure son mot de passe.`,
    metadata: { role: user.role },
    source: "INVITE_FLOW"
  });
  redirect("/login?invite=accepted");
}

export async function requestPasswordReset(formData: FormData) {
  const email = text(formData, "email")?.toLowerCase();
  if (!email) redirect("/forgot-password?sent=1");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required for password reset requests.");
    redirect("/forgot-password?sent=1");
  }

  const ip = await actionIp();
  let byIp;
  let byEmail;
  try {
    [byIp, byEmail] = await Promise.all([
      rateLimit({ key: `password-reset:ip:${ip}`, limit: 8, windowMs: 15 * 60 * 1000 }),
      rateLimit({ key: `password-reset:email:${email}`, limit: 3, windowMs: 15 * 60 * 1000 })
    ]);
  } catch (error) {
    console.error("Password reset rate limit failed", error);
    redirect("/forgot-password?sent=1");
  }
  if (!byIp.allowed || !byEmail.allowed) redirect("/forgot-password?sent=1");

  let emailFailed = false;
  try {
    const user = await prisma.user.findUnique({ where: { email }, include: { firm: true } });
    if (user?.isActive) {
      const { token, tokenHash } = generatePasswordResetToken();
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() }
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: passwordResetExpiresAt()
          }
        })
      ]);

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink: passwordResetUrl(token) });
    } catch {
      emailFailed = true;
    }

    if (user.firmId) {
      await recordOperationalEvent({
        firmId: user.firmId,
        actorUserId: user.id,
        actorType: OperationalActorType.USER,
        eventType: "PASSWORD_RESET_REQUESTED",
        eventTitle: "Reinitialisation mot de passe demandee",
        eventDescription: "Un lien de reinitialisation de mot de passe a été généré.",
        metadata: { email: user.email },
        source: "AUTH_PASSWORD_RESET"
      });
    }
    }
  } catch (error) {
    console.error("Password reset request failed", error);
  }

  if (emailFailed) redirect("/forgot-password?error=email");
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordWithToken(token: string, formData: FormData) {
  const password = text(formData, "password") || "";
  const confirmPassword = text(formData, "confirmPassword") || "";
  if (password !== confirmPassword) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);
  const strengthError = passwordStrengthError(password);
  if (strengthError) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=weak`);

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { user: true }
  });
  if (!reset || !isPasswordResetUsable(reset) || !reset.user.isActive) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid`);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        passwordChangedAt: new Date(),
        disabledAt: null,
        disabledReason: null
      }
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() }
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: reset.userId, usedAt: null },
      data: { usedAt: new Date() }
    })
  ]);

  if (reset.user.firmId) {
    await recordOperationalEvent({
      firmId: reset.user.firmId,
      actorUserId: reset.user.id,
      actorType: OperationalActorType.USER,
      eventType: "PASSWORD_RESET_COMPLETED",
      eventTitle: "Mot de passe réinitialisé",
      eventDescription: "L'utilisateur a configure un nouveau mot de passe via le lien de reinitialisation.",
      metadata: { email: reset.user.email },
      source: "AUTH_PASSWORD_RESET"
    });
  }

  redirect("/login?reset=done");
}

async function canManageInvite(inviteId: string) {
  const user = await requireUser();
  const invite = await prisma.userInvite.findUnique({ where: { id: inviteId }, include: { firm: true } });
  if (!invite) return null;
  if (user.role === UserRole.ADMIN) return { user, invite, returnTo: "/admin/invites" };
  if (
    user.firmId === invite.firmId &&
    (user.role === UserRole.OWNER || user.role === UserRole.MANAGER) &&
    invite.role !== UserRole.ADMIN &&
    invite.role !== UserRole.OWNER
  ) {
    return { user, invite, returnTo: "/app/settings/team" };
  }
  return null;
}

export async function resendInvite(inviteId: string) {
  const context = await canManageInvite(inviteId);
  if (!context || context.invite.acceptedAt) redirect("/login");
  const { token, tokenHash } = generateInviteToken();
  await prisma.userInvite.update({
    where: { id: inviteId },
    data: { tokenHash, expiresAt: inviteExpiresAt(), acceptedAt: null, revokedAt: null, createdByUserId: context.user.id }
  });
  await sendInviteEmail({
    to: context.invite.email,
    name: context.invite.name,
    firmName: context.invite.firm.name,
    inviteLink: inviteUrl(token)
  });
  await recordAdminAction({
    firmId: context.invite.firmId,
    actorUserId: context.user.id,
    eventType: "INVITE_RESENT",
    eventTitle: "Invitation renvoyee",
    eventDescription: "Un nouveau lien d'invitation a été généré.",
    metadata: { email: context.invite.email, role: context.invite.role }
  });
  revalidatePath(context.returnTo);
  redirect(`${context.returnTo}?created=${encodeURIComponent(token)}`);
}

export async function cancelInvite(inviteId: string) {
  const context = await canManageInvite(inviteId);
  if (!context || context.invite.acceptedAt) redirect("/login");
  await prisma.userInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  await recordAdminAction({
    firmId: context.invite.firmId,
    actorUserId: context.user.id,
    eventType: "INVITE_REVOKED",
    eventTitle: "Invitation revoquee",
    eventDescription: "Une invitation a été revoquee.",
    metadata: { email: context.invite.email, role: context.invite.role }
  });
  revalidatePath(context.returnTo);
  redirect(context.returnTo);
}

export async function disableUser(userId: string, formData: FormData) {
  const actor = await requireUser();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.id === actor.id || target.role === UserRole.ADMIN) redirect("/login");
  const adminAllowed = actor.role === UserRole.ADMIN;
  const firmAllowed = actor.firmId && actor.firmId === target.firmId && (actor.role === UserRole.OWNER || actor.role === UserRole.MANAGER);
  if (!adminAllowed && !firmAllowed) redirect("/login");
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      disabledAt: new Date(),
      disabledReason: text(formData, "disabledReason") || "Disabled by administrator"
    }
  });
  revalidatePath(adminAllowed ? "/admin/users" : "/app/settings/team");
}

export async function enableUser(userId: string) {
  const actor = await requireUser();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === UserRole.ADMIN) redirect("/login");
  const adminAllowed = actor.role === UserRole.ADMIN;
  const firmAllowed = actor.firmId && actor.firmId === target.firmId && (actor.role === UserRole.OWNER || actor.role === UserRole.MANAGER);
  if (!adminAllowed && !firmAllowed) redirect("/login");
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true, disabledAt: null, disabledReason: null }
  });
  revalidatePath(adminAllowed ? "/admin/users" : "/app/settings/team");
}

export async function suspendFirm(firmId: string, formData: FormData) {
  const admin = await requireAdmin();
  const reason = text(formData, "suspendedReason") || "Suspended by SaaS admin";
  await prisma.firm.update({
    where: { id: firmId },
    data: { status: FirmStatus.SUSPENDED, suspendedAt: new Date(), suspendedReason: reason }
  });
  await recordAdminAction({
    firmId,
    actorUserId: admin.id,
    eventType: "FIRM_SUSPENDED",
    eventTitle: "Cabinet suspendu",
    eventDescription: reason
  });
  revalidatePath("/admin/firms");
  revalidatePath(`/admin/firms/${firmId}`);
}

export async function reactivateFirm(firmId: string) {
  const admin = await requireAdmin();
  await prisma.firm.update({
    where: { id: firmId },
    data: { status: FirmStatus.ACTIVE, suspendedAt: null, suspendedReason: null, cancelledAt: null }
  });
  await recordAdminAction({
    firmId,
    actorUserId: admin.id,
    eventType: "FIRM_REACTIVATED",
    eventTitle: "Cabinet reactive",
    eventDescription: "Le cabinet a été reactive."
  });
  revalidatePath("/admin/firms");
  revalidatePath(`/admin/firms/${firmId}`);
}

export async function changeFirmPlan(firmId: string, formData: FormData) {
  const admin = await requireAdmin();
  const plan = text(formData, "plan") || "STARTER";
  const status = firmStatusValue(text(formData, "status"), FirmStatus.TRIAL);
  await prisma.firm.update({
    where: { id: firmId },
    data: {
      plan,
      status,
      trialStartDate: dateValue(formData, "trialStartDate"),
      trialEndDate: dateValue(formData, "trialEndDate"),
      cancelledAt: status === FirmStatus.CANCELLED ? new Date() : null
    }
  });
  const subscription = await ensureFirmSubscription(firmId, plan, {
    trialEndsAt: dateValue(formData, "trialEndDate"),
    status
  });
  const planRecord = await getPlanByCode(plan);
  if (planRecord) {
    await prisma.firmSubscription.update({
      where: { id: subscription.id },
      data: { planId: planRecord.id }
    });
  }
  await recordAdminAction({
    firmId,
    actorUserId: admin.id,
    eventType: "PLAN_CHANGED",
    eventTitle: "Plan cabinet modifie",
    eventDescription: `Plan ${plan}, statut ${status}.`,
    metadata: { plan, status }
  });
  revalidatePath("/admin/firms");
  revalidatePath(`/admin/firms/${firmId}`);
}

export async function transferOwnership(formData: FormData) {
  const actor = await requireUser();
  const targetUserId = text(formData, "targetUserId");
  const firmIdFromForm = text(formData, "firmId");
  if (!targetUserId) redirect("/login");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || !target.firmId || target.role === UserRole.ADMIN || !target.isActive) redirect("/login");
  const isAdmin = actor.role === UserRole.ADMIN;
  const isOwnerSameFirm = actor.role === UserRole.OWNER && actor.firmId === target.firmId;
  if (!isAdmin && !isOwnerSameFirm) redirect("/login");
  if (firmIdFromForm && firmIdFromForm !== target.firmId) redirect("/login");

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { firmId: target.firmId, role: UserRole.OWNER, id: { not: target.id } },
      data: { role: UserRole.MANAGER }
    });
    await tx.user.update({ where: { id: target.id }, data: { role: UserRole.OWNER } });
  });
  await recordAdminAction({
    firmId: target.firmId,
    actorUserId: actor.id,
    eventType: "OWNERSHIP_TRANSFERRED",
    eventTitle: "Propriete transferee",
    eventDescription: `${target.email} est maintenant propriétaire du cabinet.`,
    metadata: { targetUserId: target.id, targetEmail: target.email }
  });
  revalidatePath(isAdmin ? `/admin/firms/${target.firmId}` : "/app/settings/team");
}

export async function createTvaFilingCaseAction(clientCollectionId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    include: { collectionPeriod: true, client: { include: { fiscalProfile: true } } }
  });
  if (!item) return;
  const fiscalConfig = await prisma.fiscalConfig.findUnique({ where: { firmId: user.firmId } });
  const deadlines = tvaFilingDeadlinesWithConfig(
    item.collectionPeriod.workflowType,
    item.collectionPeriod.year,
    item.collectionPeriod.month,
    fiscalConfig,
    item.client.fiscalProfile
  );
  const filingCase = await prisma.tvaFilingCase.upsert({
    where: { clientCollectionId: item.id },
    update: {},
    create: {
      firmId: user.firmId,
      clientId: item.clientId,
      clientCollectionId: item.id,
      periodMonth: item.collectionPeriod.month,
      periodYear: item.collectionPeriod.year,
      status: item.tvaPreparationStatus === TvaPreparationStatus.READY_TO_DECLARE ? TvaFilingStatus.READY_TO_FILE : TvaFilingStatus.DRAFT,
      declarationDeadline: deadlines.declarationDeadline,
      paymentDeadline: deadlines.paymentDeadline,
      assignedUserId: user.id,
      preparedByUserId: user.id
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "TVA_FILING_CASE_CREATED",
    eventTitle: "Dossier declaration TVA cree",
    eventDescription: "Un dossier de declaration TVA a été créé pour cette période.",
    metadata: { filingCaseId: filingCase.id, status: filingCase.status },
    source: "APP_TVA_FILING"
  });
  revalidatePath("/app/tva-filing");
  redirect(`/app/tva-filing/${filingCase.id}`);
}

export async function updateTvaSubmissionAction(filingCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const filingCase = await prisma.tvaFilingCase.findFirst({ where: { id: filingCaseId, firmId: user.firmId } });
  if (!filingCase) return;
  const statusValue = text(formData, "status") || TvaSubmissionStatus.NOT_SUBMITTED;
  const status = Object.values(TvaSubmissionStatus).includes(statusValue as TvaSubmissionStatus)
    ? (statusValue as TvaSubmissionStatus)
    : TvaSubmissionStatus.NOT_SUBMITTED;
  const submittedAt = dateValue(formData, "submittedAt");
  await prisma.tvaSubmission.create({
    data: {
      firmId: user.firmId,
      filingCaseId,
      status,
      externalReference: text(formData, "externalReference"),
      submittedAt,
      submittedByUserId: status === TvaSubmissionStatus.SUBMITTED ? user.id : null,
      rejectionReason: text(formData, "rejectionReason"),
      notes: text(formData, "notes")
    }
  });
  await prisma.tvaFilingCase.update({
    where: { id: filingCaseId },
    data: {
      status:
        status === TvaSubmissionStatus.SUBMITTED
          ? TvaFilingStatus.PAYMENT_PENDING
          : status === TvaSubmissionStatus.REJECTED || status === TvaSubmissionStatus.NEEDS_CORRECTION
            ? TvaFilingStatus.BLOCKED
            : filingCase.status,
      filedAt: status === TvaSubmissionStatus.SUBMITTED ? submittedAt || new Date() : filingCase.filedAt,
      filedByUserId: status === TvaSubmissionStatus.SUBMITTED ? user.id : filingCase.filedByUserId
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: filingCase.clientId,
    clientCollectionId: filingCase.clientCollectionId,
    eventType: "TVA_DECLARATION_SUBMISSION_UPDATED",
    eventTitle: "Déclaration TVA mise a jour",
    eventDescription: `Statut submission: ${status}.`,
    metadata: { filingCaseId, status, externalReference: text(formData, "externalReference") },
    source: "APP_TVA_FILING"
  });
  revalidatePath("/app/tva-filing");
  revalidatePath(`/app/tva-filing/${filingCaseId}`);
}

export async function updateTvaPaymentAction(filingCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const filingCase = await prisma.tvaFilingCase.findFirst({ where: { id: filingCaseId, firmId: user.firmId } });
  if (!filingCase) return;
  const statusValue = text(formData, "status") || TvaPaymentStatus.PENDING;
  const methodValue = text(formData, "paymentMethod");
  const status = Object.values(TvaPaymentStatus).includes(statusValue as TvaPaymentStatus)
    ? (statusValue as TvaPaymentStatus)
    : TvaPaymentStatus.PENDING;
  const paymentMethod = methodValue && Object.values(TvaPaymentMethod).includes(methodValue as TvaPaymentMethod)
    ? (methodValue as TvaPaymentMethod)
    : null;
  await prisma.tvaPayment.upsert({
    where: { filingCaseId },
    update: {
      status,
      amountDue: numberValue(formData, "amountDue"),
      amountPaid: numberValue(formData, "amountPaid"),
      paymentDate: dateValue(formData, "paymentDate"),
      paymentMethod,
      paymentReference: text(formData, "paymentReference"),
      notes: text(formData, "notes")
    },
    create: {
      firmId: user.firmId,
      filingCaseId,
      status,
      amountDue: numberValue(formData, "amountDue"),
      amountPaid: numberValue(formData, "amountPaid"),
      paymentDate: dateValue(formData, "paymentDate"),
      paymentMethod,
      paymentReference: text(formData, "paymentReference"),
      notes: text(formData, "notes")
    }
  });
  await prisma.tvaFilingCase.update({
    where: { id: filingCaseId },
    data: { status: status === TvaPaymentStatus.PAID || status === TvaPaymentStatus.NOT_REQUIRED ? TvaFilingStatus.PAID : TvaFilingStatus.PAYMENT_PENDING }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: filingCase.clientId,
    clientCollectionId: filingCase.clientCollectionId,
    eventType: "TVA_PAYMENT_UPDATED",
    eventTitle: "Paiement TVA mis a jour",
    eventDescription: `Statut paiement: ${status}.`,
    metadata: { filingCaseId, status, amountDue: numberValue(formData, "amountDue"), amountPaid: numberValue(formData, "amountPaid") },
    source: "APP_TVA_FILING"
  });
  revalidatePath("/app/tva-filing");
  revalidatePath(`/app/tva-filing/${filingCaseId}`);
}

export async function lockClientCollectionAction(clientCollectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({ where: { id: clientCollectionId, firmId: user.firmId } });
  if (!item) return;
  const reason = text(formData, "lockReason") || "Période verrouillee pour preparation TVA.";
  await prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { isLocked: true, lockedAt: new Date(), lockedByUserId: user.id, lockReason: reason }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId,
    eventType: "TVA_PERIOD_LOCKED",
    eventTitle: "Période TVA verrouillee",
    eventDescription: reason,
    source: "APP_TVA_FILING"
  });
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
  revalidatePath("/app/tva-filing");
}

export async function unlockClientCollectionAction(clientCollectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({ where: { id: clientCollectionId, firmId: user.firmId } });
  if (!item) return;
  const reason = text(formData, "unlockReason") || "Période rouverte.";
  await prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { isLocked: false, lockedAt: null, lockedByUserId: null, lockReason: null }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId,
    eventType: "TVA_PERIOD_UNLOCKED",
    eventTitle: "Période TVA rouverte",
    eventDescription: reason,
    source: "APP_TVA_FILING"
  });
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
  revalidatePath("/app/tva-filing");
}

export async function createFiscalAuditCaseAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const clientId = text(formData, "clientId");
  const title = text(formData, "title");
  if (!clientId || !title) return;
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
  if (!client) return;
  const typeValue = text(formData, "type") || FiscalAuditCaseType.TAX_CONTROL;
  const severityValue = text(formData, "severity") || FiscalSeverity.MEDIUM;
  const type = Object.values(FiscalAuditCaseType).includes(typeValue as FiscalAuditCaseType) ? (typeValue as FiscalAuditCaseType) : FiscalAuditCaseType.TAX_CONTROL;
  const severity = Object.values(FiscalSeverity).includes(severityValue as FiscalSeverity) ? (severityValue as FiscalSeverity) : FiscalSeverity.MEDIUM;
  const auditCase = await prisma.fiscalAuditCase.create({
    data: {
      firmId: user.firmId,
      clientId,
      relatedFilingCaseId: text(formData, "relatedFilingCaseId"),
      title,
      type,
      severity,
      openedByUserId: user.id,
      assignedUserId: user.id,
      summary: text(formData, "summary")
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId,
    eventType: "FISCAL_AUDIT_CASE_CREATED",
    eventTitle: "Dossier contrôle fiscal cree",
    eventDescription: title,
    metadata: { auditCaseId: auditCase.id, type, severity },
    source: "APP_FISCAL_AUDITS"
  });
  revalidatePath("/app/fiscal-audits");
  redirect(`/app/fiscal-audits/${auditCase.id}`);
}

export async function updateFiscalAuditCaseStatusAction(auditCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const auditCase = await prisma.fiscalAuditCase.findFirst({ where: { id: auditCaseId, firmId: user.firmId } });
  if (!auditCase) return;
  const statusValue = text(formData, "status") || auditCase.status;
  const status = Object.values(FiscalAuditCaseStatus).includes(statusValue as FiscalAuditCaseStatus)
    ? (statusValue as FiscalAuditCaseStatus)
    : auditCase.status;
  await prisma.fiscalAuditCase.update({
    where: { id: auditCaseId },
    data: {
      status,
      closedAt: status === FiscalAuditCaseStatus.CLOSED || status === FiscalAuditCaseStatus.RESOLVED ? new Date() : null
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: auditCase.clientId,
    eventType: "FISCAL_AUDIT_STATUS_UPDATED",
    eventTitle: "Statut contrôle fiscal mis a jour",
    eventDescription: `Statut: ${status}.`,
    metadata: { auditCaseId, status },
    source: "APP_FISCAL_AUDITS"
  });
  revalidatePath("/app/fiscal-audits");
  revalidatePath(`/app/fiscal-audits/${auditCaseId}`);
}

export async function createTaxAuthorityNoticeAction(auditCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const auditCase = await prisma.fiscalAuditCase.findFirst({ where: { id: auditCaseId, firmId: user.firmId } });
  if (!auditCase) return;
  const typeValue = text(formData, "type") || TaxAuthorityNoticeType.REQUEST_INFO;
  const statusValue = text(formData, "status") || TaxAuthorityNoticeStatus.RESPONSE_REQUIRED;
  const type = Object.values(TaxAuthorityNoticeType).includes(typeValue as TaxAuthorityNoticeType) ? (typeValue as TaxAuthorityNoticeType) : TaxAuthorityNoticeType.REQUEST_INFO;
  const status = Object.values(TaxAuthorityNoticeStatus).includes(statusValue as TaxAuthorityNoticeStatus)
    ? (statusValue as TaxAuthorityNoticeStatus)
    : TaxAuthorityNoticeStatus.RESPONSE_REQUIRED;
  await prisma.taxAuthorityNotice.create({
    data: {
      firmId: user.firmId,
      clientId: auditCase.clientId,
      filingCaseId: auditCase.relatedFilingCaseId,
      auditCaseId,
      type,
      receivedAt: dateValue(formData, "receivedAt") || new Date(),
      responseDeadline: dateValue(formData, "responseDeadline"),
      referenceNumber: text(formData, "referenceNumber"),
      summary: text(formData, "summary"),
      status,
      createdByUserId: user.id
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: auditCase.clientId,
    eventType: "TAX_AUTHORITY_NOTICE_LOGGED",
    eventTitle: "Notice fiscale enregistree",
    eventDescription: text(formData, "summary") || "Notice fiscale ajoutee.",
    metadata: { auditCaseId, type, status },
    source: "APP_FISCAL_AUDITS"
  });
  revalidatePath(`/app/fiscal-audits/${auditCaseId}`);
}

export async function createFiscalEvidenceRequestAction(auditCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const auditCase = await prisma.fiscalAuditCase.findFirst({ where: { id: auditCaseId, firmId: user.firmId } });
  const title = text(formData, "title");
  if (!auditCase || !title) return;
  const statusValue = text(formData, "status") || FiscalEvidenceRequestStatus.TODO;
  const status = Object.values(FiscalEvidenceRequestStatus).includes(statusValue as FiscalEvidenceRequestStatus)
    ? (statusValue as FiscalEvidenceRequestStatus)
    : FiscalEvidenceRequestStatus.TODO;
  await prisma.fiscalEvidenceRequest.create({
    data: {
      firmId: user.firmId,
      auditCaseId,
      title,
      description: text(formData, "description"),
      requestedBy: text(formData, "requestedBy") || "Administration fiscale",
      dueDate: dateValue(formData, "dueDate"),
      status,
      assignedUserId: user.id,
      responseText: text(formData, "responseText")
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: auditCase.clientId,
    eventType: "FISCAL_EVIDENCE_REQUEST_CREATED",
    eventTitle: "Demande de preuve créée",
    eventDescription: title,
    metadata: { auditCaseId, status },
    source: "APP_FISCAL_AUDITS"
  });
  revalidatePath(`/app/fiscal-audits/${auditCaseId}`);
}

export async function createAuditResponseDraftAction(auditCaseId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const auditCase = await prisma.fiscalAuditCase.findFirst({ where: { id: auditCaseId, firmId: user.firmId } });
  const title = text(formData, "title");
  const responseBody = text(formData, "responseBody");
  if (!auditCase || !title || !responseBody) return;
  const statusValue = text(formData, "status") || AuditResponseStatus.DRAFT;
  const status = Object.values(AuditResponseStatus).includes(statusValue as AuditResponseStatus)
    ? (statusValue as AuditResponseStatus)
    : AuditResponseStatus.DRAFT;
  await prisma.auditResponseDraft.create({
    data: {
      firmId: user.firmId,
      auditCaseId,
      title,
      responseBody,
      status,
      createdByUserId: user.id,
      sentAt: status === AuditResponseStatus.SENT ? new Date() : null
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: auditCase.clientId,
    eventType: "AUDIT_RESPONSE_DRAFT_CREATED",
    eventTitle: "Brouillon de reponse fiscale cree",
    eventDescription: title,
    metadata: { auditCaseId, status },
    source: "APP_FISCAL_AUDITS"
  });
  revalidatePath(`/app/fiscal-audits/${auditCaseId}`);
}

export async function createClientAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const companyName = text(formData, "companyName");
  if (!companyName) return;
  try {
    await requireWithinLimit(user.firmId, "CLIENTS");
  } catch (error) {
    if (error instanceof BillingEnforcementError) redirect(`/app/clients?error=${error.code}`);
    throw error;
  }

  const client = await prisma.client.create({
    data: {
      firmId: user.firmId,
      companyName,
      contactName: text(formData, "contactName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      ice: text(formData, "ice"),
      taxId: text(formData, "taxId"),
      city: text(formData, "city"),
      notes: text(formData, "notes")
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: client.id,
    eventType: "CLIENT_CREATED",
    eventTitle: "Client cree",
    eventDescription: `${client.companyName} a été ajoute au cabinet.`,
    metadata: { companyName: client.companyName, city: client.city },
    source: "APP_CLIENTS"
  });
  revalidatePath("/app/clients");
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const companyName = text(formData, "companyName");
  if (!companyName) return;
  await prisma.client.updateMany({
    where: { id: clientId, firmId: user.firmId },
    data: {
      companyName,
      contactName: text(formData, "contactName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      ice: text(formData, "ice"),
      taxId: text(formData, "taxId"),
      city: text(formData, "city"),
      notes: text(formData, "notes")
    }
  });
  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/clients");
}

export async function deleteClientAction(clientId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId, deletedAt: null } });
  if (!client) redirect("/app/clients");
  await prisma.client.updateMany({
    where: { id: clientId, firmId: user.firmId },
    data: { deletedAt: new Date(), deletedByUserId: user.id, deleteReason: "Suppression depuis l'application" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId,
    eventType: "CLIENT_DELETED",
    eventTitle: "Client supprime",
    eventDescription: `${client.companyName} a été place dans la corbeille.`,
    source: "APP_CLIENTS"
  });
  revalidatePath("/app/clients");
  revalidatePath("/app/trash");
  redirect("/app/clients");
}

export async function restoreClientAction(clientId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId, deletedAt: { not: null } } });
  if (!client) return;
  await prisma.client.updateMany({
    where: { id: clientId, firmId: user.firmId },
    data: { deletedAt: null, deletedByUserId: null, deleteReason: null }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId,
    eventType: "CLIENT_RESTORED",
    eventTitle: "Client restaure",
    eventDescription: `${client.companyName} a été restaure.`,
    source: "APP_TRASH"
  });
  revalidatePath("/app/clients");
  revalidatePath("/app/trash");
}

export async function createCollectionAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const name = text(formData, "name");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const requestedWorkflowType = text(formData, "workflowType");
  const workflowType =
    requestedWorkflowType && requestedWorkflowType in WorkflowType ? (requestedWorkflowType as WorkflowType) : WorkflowType.TVA_MONTHLY;
  const clientIds = formData.getAll("clientIds").filter((value): value is string => typeof value === "string");
  if (!name || !month || !year) return;
  try {
    await requireWithinLimit(user.firmId, "ACTIVE_COLLECTIONS");
  } catch (error) {
    if (error instanceof BillingEnforcementError) redirect(`/app/collections?error=${error.code}`);
    throw error;
  }
  const collection = await prisma.collectionPeriod.create({
    data: { firmId: user.firmId, name, month, year, workflowType, status: "ACTIVE" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId: collection.id,
    eventType: "COLLECTION_CREATED",
    eventTitle: "Collecte créée",
    eventDescription: `${collection.name} a été créée.`,
    metadata: { name: collection.name, month: collection.month, year: collection.year, workflowType },
    source: "APP_COLLECTIONS"
  });

  if (clientIds.length) {
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds }, firmId: user.firmId, deletedAt: null } });
    const requiredDocuments = requiredDocumentsForWorkflow(workflowType, user.firm.defaultRequiredDocuments);
    for (const client of clients) {
      const clientCollection = await prisma.clientCollection.upsert({
        where: { clientId_collectionPeriodId: { clientId: client.id, collectionPeriodId: collection.id } },
        update: {},
        create: {
          firmId: user.firmId,
          clientId: client.id,
          collectionPeriodId: collection.id,
          uploadToken: generateUploadToken(),
          uploadTokenExpiresAt: uploadTokenExpiryDate(),
          requiredDocuments: {
            create: requiredDocuments.map((docName) => ({ firmId: user.firmId, name: docName, isRequired: true }))
          }
        }
      });
      await recordOperationalEvent({
        firmId: user.firmId,
        actorUserId: user.id,
        actorType: OperationalActorType.USER,
        clientId: client.id,
        collectionId: collection.id,
        clientCollectionId: clientCollection.id,
        eventType: "UPLOAD_LINK_GENERATED",
        eventTitle: "Lien de dépôt généré",
        eventDescription: `Lien de dépôt généré pour ${client.companyName}.`,
        metadata: { requiredDocuments },
        source: "APP_COLLECTIONS"
      });
    }
  }

  revalidatePath("/app/collections");
  redirect(`/app/collections/${collection.id}`);
}

export async function addClientsToCollectionAction(collectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const ids = formData.getAll("clientIds").filter((value): value is string => typeof value === "string");
  const collection = await prisma.collectionPeriod.findFirst({ where: { id: collectionId, firmId: user.firmId } });
  if (!collection) return;
  const requiredDocuments = requiredDocumentsForWorkflow(collection.workflowType, user.firm.defaultRequiredDocuments);

  for (const clientId of ids) {
    const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId, deletedAt: null } });
    if (!client) continue;
    const clientCollection = await prisma.clientCollection.upsert({
      where: { clientId_collectionPeriodId: { clientId, collectionPeriodId: collectionId } },
      update: {},
      create: {
        firmId: user.firmId,
        clientId,
        collectionPeriodId: collectionId,
        uploadToken: generateUploadToken(),
        uploadTokenExpiresAt: uploadTokenExpiryDate(),
        requiredDocuments: {
          create: requiredDocuments.map((name) => ({ firmId: user.firmId, name, isRequired: true }))
        }
      }
    });
    await recordOperationalEvent({
      firmId: user.firmId,
      actorUserId: user.id,
      actorType: OperationalActorType.USER,
      clientId,
      collectionId,
      clientCollectionId: clientCollection.id,
      eventType: "UPLOAD_LINK_GENERATED",
      eventTitle: "Lien de dépôt généré",
      eventDescription: `Lien de dépôt généré pour ${client.companyName}.`,
      metadata: { requiredDocuments },
      source: "APP_COLLECTION_DETAIL"
    });
  }
  revalidatePath(`/app/collections/${collectionId}`);
}

export async function markRequiredDocumentAction(requiredDocumentId: string, status: RequiredDocumentStatus) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const doc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, firmId: user.firmId },
    select: { name: true, clientCollectionId: true, clientCollection: { select: { clientId: true, collectionPeriodId: true } } }
  });
  if (!doc) return;
  await prisma.requiredDocument.update({ where: { id: requiredDocumentId }, data: { status } });
  await recalculateClientCollectionStatus(doc.clientCollectionId);
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: doc.clientCollection.clientId,
    collectionId: doc.clientCollection.collectionPeriodId,
    clientCollectionId: doc.clientCollectionId,
    obligationId: requiredDocumentId,
    eventType: "DOCUMENT_REVIEWED",
    eventTitle: "Document requis mis a jour",
    eventDescription: `${doc.name} marque ${status}.`,
    metadata: { requiredDocumentName: doc.name, status },
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
}

export async function markClientCollectionCompleteAction(clientCollectionId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    select: { clientId: true, collectionPeriodId: true }
  });
  if (!item) return;
  await prisma.clientCollection.updateMany({
    where: { id: clientCollectionId, firmId: user.firmId },
    data: { status: "COMPLETE" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId,
    eventType: "CLIENT_COLLECTION_COMPLETED",
    eventTitle: "Dossier client marque complet",
    eventDescription: "Le dossier client a été marque complet.",
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
}

export async function updateCollectionStatusAction(collectionId: string, status: CollectionStatus) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  await prisma.collectionPeriod.updateMany({
    where: { id: collectionId, firmId: user.firmId },
    data: { status }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId,
    eventType: status === CollectionStatus.CLOSED ? "COLLECTION_CLOSED" : status === CollectionStatus.ACTIVE ? "COLLECTION_REOPENED" : "COLLECTION_STATUS_UPDATED",
    eventTitle: "Statut collecte mis a jour",
    eventDescription: `Statut mis a jour: ${status}.`,
    metadata: { status },
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
  revalidatePath(`/app/collections/${collectionId}`);
}

export async function restoreCollectionAction(collectionId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id: collectionId, firmId: user.firmId, deletedAt: { not: null } }
  });
  if (!collection) return;
  await prisma.collectionPeriod.updateMany({
    where: { id: collectionId, firmId: user.firmId },
    data: { deletedAt: null, deletedByUserId: null, deleteReason: null }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId,
    eventType: "COLLECTION_RESTORED",
    eventTitle: "Collecte restauree",
    eventDescription: `${collection.name} a été restauree.`,
    source: "APP_TRASH"
  });
  revalidatePath("/app/collections");
  revalidatePath("/app/trash");
}

export async function classifyUploadedDocumentAction(documentId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const requiredDocumentId = text(formData, "requiredDocumentId");
  const document = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, firmId: user.firmId },
    include: { clientCollection: { include: { requiredDocuments: true } } }
  });
  if (!document) return { error: "Document introuvable." };

  const targetDoc = requiredDocumentId
    ? document.clientCollection.requiredDocuments.find((doc) => doc.id === requiredDocumentId)
    : null;
  if (requiredDocumentId && !targetDoc) return { error: "Classification invalide." };

  await prisma.uploadedDocument.update({
    where: { id: document.id },
    data: { requiredDocumentId: targetDoc?.id || null }
  });

  if (targetDoc) {
    await prisma.requiredDocument.update({
      where: { id: targetDoc.id },
      data: { status: RequiredDocumentStatus.RECEIVED }
    });
  }

  await recalculateClientCollectionStatus(document.clientCollectionId);
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: document.clientCollection.clientId,
    collectionId: document.clientCollection.collectionPeriodId,
    clientCollectionId: document.clientCollectionId,
    obligationId: targetDoc?.id || null,
    documentId: document.id,
    eventType: "DOCUMENT_REVIEWED",
    eventTitle: "Document classe",
    eventDescription: targetDoc ? `Document classe comme ${targetDoc.name}.` : "Document laisse non classe.",
    metadata: { requiredDocumentId: targetDoc?.id || null, requiredDocumentName: targetDoc?.name || null },
    source: "APP_DOCUMENTS"
  });
  revalidatePath("/app/documents");
  revalidatePath("/documents");
  revalidatePath(`/app/collections/${document.clientCollection.collectionPeriodId}`);
  return { ok: true, requiredDocumentId: targetDoc?.id || null, requiredDocumentName: targetDoc?.name || null };
}

export async function updateUploadedDocumentQualityAction(documentId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const status = formData.get("qualityStatus");
  if (typeof status !== "string" || !Object.values(DocumentQualityStatus).includes(status as DocumentQualityStatus)) return { error: "Statut invalide." };
  const document = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, firmId: user.firmId },
    select: {
      clientCollectionId: true,
      originalFileName: true,
      qualityStatus: true,
      accountantComment: true,
      requiredDocument: { select: { name: true } },
      clientCollection: {
        select: {
          clientId: true,
          collectionPeriodId: true,
          uploadToken: true,
          client: { select: { companyName: true, contactName: true, email: true } },
          collectionPeriod: { select: { name: true } }
        }
      }
    }
  });
  if (!document) return { error: "Document introuvable." };

  const newComment = text(formData, "accountantComment");
  const wasRejected = isRejectedQuality(document.qualityStatus);
  const isNowRejected = isRejectedQuality(status);
  const changed = document.qualityStatus !== status || document.accountantComment !== newComment;
  const shouldNotifyClient = isNowRejected && changed;

  await prisma.uploadedDocument.update({
    where: { id: documentId },
    data: {
      qualityStatus: status as DocumentQualityStatus,
      accountantComment: newComment
    }
  });

  let clientNotified = false;
  let clientNotifyError: string | null = null;
  const clientEmail = document.clientCollection.client.email;
  if (shouldNotifyClient && clientEmail) {
    try {
      await sendDocumentRejectedEmail({
        to: clientEmail,
        clientName: document.clientCollection.client.contactName || document.clientCollection.client.companyName,
        firmName: user.firm.name,
        collectionName: document.clientCollection.collectionPeriod.name,
        documentName: document.requiredDocument?.name || document.originalFileName,
        reason: newComment,
        uploadLink: uploadUrl(document.clientCollection.uploadToken)
      });
      clientNotified = true;
    } catch (error) {
      clientNotifyError = error instanceof Error ? error.message : String(error);
      await logServerError({
        error,
        firmId: user.firmId,
        userId: user.id,
        metadata: { documentId, context: "document-rejected-email" }
      });
    }
  }

  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: document.clientCollection.clientId,
    collectionId: document.clientCollection.collectionPeriodId,
    clientCollectionId: document.clientCollectionId,
    documentId,
    eventType: status === DocumentQualityStatus.VALID ? "DOCUMENT_REVIEWED" : "DOCUMENT_REJECTED",
    eventTitle: status === DocumentQualityStatus.VALID ? "Document valide" : "Document rejete",
    eventDescription: `${document.originalFileName}: ${status}.`,
    metadata: {
      qualityStatus: status,
      accountantComment: newComment,
      wasAlreadyRejected: wasRejected,
      clientNotified,
      clientNotifyError
    },
    source: "APP_DOCUMENTS"
  });

  revalidatePath("/app/documents");
  revalidatePath("/documents");
  revalidatePath(`/app/collections/${document.clientCollection.collectionPeriodId}`);
  return { ok: true, qualityStatus: status, accountantComment: newComment };
}

export async function restoreUploadedDocumentAction(documentId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const document = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, firmId: user.firmId, deletedAt: { not: null } },
    select: { originalFileName: true, clientCollectionId: true, clientCollection: { select: { clientId: true, collectionPeriodId: true } } }
  });
  if (!document) return;
  await prisma.uploadedDocument.updateMany({
    where: { id: documentId, firmId: user.firmId },
    data: { deletedAt: null, deletedByUserId: null, deleteReason: null }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: document.clientCollection.clientId,
    collectionId: document.clientCollection.collectionPeriodId,
    clientCollectionId: document.clientCollectionId,
    documentId,
    eventType: "DOCUMENT_RESTORED",
    eventTitle: "Document restaure",
    eventDescription: `${document.originalFileName} a été restaure.`,
    source: "APP_TRASH"
  });
  revalidatePath("/app/documents");
  revalidatePath("/app/trash");
}

export async function updateClientCollectionNotesAction(clientCollectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    select: { collectionPeriodId: true }
  });
  if (!item) return;
  await prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { accountantNotes: text(formData, "accountantNotes") }
  });
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
}

export async function createTvaAmountEntryAction(clientCollectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    include: { uploadedDocuments: true, collectionPeriod: true }
  });
  if (!item) return;
  const typeValue = text(formData, "type") || TvaAmountEntryType.PURCHASE;
  const type = Object.values(TvaAmountEntryType).includes(typeValue as TvaAmountEntryType)
    ? (typeValue as TvaAmountEntryType)
    : TvaAmountEntryType.PURCHASE;
  const uploadedDocumentId = text(formData, "uploadedDocumentId");
  const validDocument = uploadedDocumentId ? item.uploadedDocuments.find((document) => document.id === uploadedDocumentId) : null;

  await prisma.tvaAmountEntry.create({
    data: {
      firmId: user.firmId,
      clientId: item.clientId,
      clientCollectionId: item.id,
      uploadedDocumentId: validDocument?.id || null,
      type,
      invoiceNumber: text(formData, "invoiceNumber"),
      invoiceDate: dateValue(formData, "invoiceDate"),
      supplierOrCustomerName: text(formData, "supplierOrCustomerName"),
      amountHT: numberValue(formData, "amountHT") || 0,
      amountTVA: numberValue(formData, "amountTVA") || 0,
      amountTTC: numberValue(formData, "amountTTC") || 0,
      tvaRate: numberValue(formData, "tvaRate") || 20,
      notes: text(formData, "notes"),
      createdByUserId: user.id
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    documentId: validDocument?.id || null,
    eventType: "TVA_AMOUNT_ENTRY_CREATED",
    eventTitle: "Entree montant TVA ajoutee",
    eventDescription: `Entree ${type} ajoutee pour preparation TVA.`,
    metadata: {
      type,
      invoiceNumber: text(formData, "invoiceNumber"),
      amountHT: numberValue(formData, "amountHT"),
      amountTVA: numberValue(formData, "amountTVA"),
      amountTTC: numberValue(formData, "amountTTC")
    },
    source: "APP_TVA_READINESS"
  });
  revalidatePath("/app/tva-readiness");
  revalidatePath(`/app/tva-readiness/${item.id}`);
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
}

export async function updateTvaPreparationStatusAction(clientCollectionId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    include: {
      requiredDocuments: true,
      uploadedDocuments: true,
      tvaAmountEntries: true
    }
  });
  if (!item) return;
  const statusValue = text(formData, "tvaPreparationStatus") || item.tvaPreparationStatus;
  const nextStatus = Object.values(TvaPreparationStatus).includes(statusValue as TvaPreparationStatus)
    ? (statusValue as TvaPreparationStatus)
    : item.tvaPreparationStatus;
  const readiness = calculateTvaReadiness(item);
  if (nextStatus === TvaPreparationStatus.READY_TO_DECLARE && !readiness.canMarkReady) {
    await prisma.tvaReadinessCheck.create({
      data: {
        firmId: user.firmId,
        clientCollectionId: item.id,
        status: readiness.status,
        missingDocumentsCount: readiness.missingDocumentsCount,
        unreviewedDocumentsCount: readiness.unreviewedDocumentsCount,
        rejectedDocumentsCount: readiness.rejectedDocumentsCount,
        unresolvedQuestionsCount: readiness.unresolvedQuestionsCount,
        pendingDeclarationsCount: readiness.pendingDeclarationsCount,
        riskLevel: readiness.riskLevel
      }
    });
    revalidatePath(`/app/tva-readiness/${item.id}`);
    return;
  }
  await prisma.clientCollection.update({
    where: { id: item.id },
    data: { tvaPreparationStatus: nextStatus }
  });
  await prisma.tvaReadinessCheck.create({
    data: {
      firmId: user.firmId,
      clientCollectionId: item.id,
      status: readiness.status,
      missingDocumentsCount: readiness.missingDocumentsCount,
      unreviewedDocumentsCount: readiness.unreviewedDocumentsCount,
      rejectedDocumentsCount: readiness.rejectedDocumentsCount,
      unresolvedQuestionsCount: readiness.unresolvedQuestionsCount,
      pendingDeclarationsCount: readiness.pendingDeclarationsCount,
      riskLevel: readiness.riskLevel
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "TVA_PREPARATION_STATUS_UPDATED",
    eventTitle: "Statut preparation TVA mis a jour",
    eventDescription: `Nouveau statut: ${nextStatus}.`,
    metadata: { nextStatus, readinessStatus: readiness.status, riskLevel: readiness.riskLevel },
    source: "APP_TVA_READINESS"
  });
  revalidatePath("/app/tva-readiness");
  revalidatePath(`/app/tva-readiness/${item.id}`);
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
}

export async function uploadDocumentsAction(token: string, formData: FormData) {
  const item = await prisma.clientCollection.findFirst({
    where: { uploadToken: token, deletedAt: null },
    include: { collectionPeriod: true, requiredDocuments: true }
  });
  if (!item || item.collectionPeriod.status !== "ACTIVE") return { error: "Lien indisponible." };
  if (item.isLocked) return { error: "Période verrouillee. Contactez votre cabinet avant tout nouveau dépôt." };
  if (item.uploadTokenDisabledAt) return { error: "Ce lien de dépôt a été desactive. Contactez votre cabinet." };
  if (item.uploadTokenExpiresAt && item.uploadTokenExpiresAt < new Date()) {
    return { error: "Ce lien de dépôt a expire. Contactez votre cabinet pour recevoir un nouveau lien." };
  }
  // This server action is the real handler behind the public /upload/[token]
  // page — it must be rate-limited the same as its JSON-API twin
  // (app/api/public/upload/[token]/route.ts), otherwise that route's limits
  // are trivially bypassed by submitting the page's own form directly.
  const ip = await actionIp();
  const [tokenLimit, ipLimit] = await Promise.all([
    rateLimit({ key: `upload:token:${token}`, limit: 20, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `upload:ip:${ip}`, limit: 40, windowMs: 15 * 60 * 1000 })
  ]);
  if (!tokenLimit.allowed || !ipLimit.allowed) {
    return { error: "Trop de tentatives. Veuillez patienter avant de reessayer." };
  }
  if (formData.get("clientAcknowledgement") !== "yes") {
    return { error: "Veuillez confirmer que les documents manquants ou en retard peuvent retarder le traitement." };
  }
  if (formData.get("clientPeriodConfirmation") !== "yes") {
    return { error: "Veuillez confirmer que les documents concernent bien la période selectionnee." };
  }
  if (formData.get("clientCompletionConfirmation") !== "yes") {
    return { error: "Veuillez confirmer avoir envoye tous les documents disponibles pour cette période." };
  }
  await recordOperationalEvent({
    firmId: item.firmId,
    actorType: OperationalActorType.CLIENT,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "CLIENT_ACCEPTED_RULES",
    eventTitle: "Regles acceptees par le client",
    eventDescription: "Le client a confirme les consequences de retard, la période et l'envoi des documents disponibles.",
    metadata: { acceptedText: clientUploadProofText, completionConfirmationText: clientCompletionConfirmationText },
    source: "PUBLIC_UPLOAD_FORM"
  });

  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return { error: "Ajoutez au moins un fichier." };

  const requiredDocumentName = text(formData, "requiredDocumentName");
  const targetDoc = requiredDocumentName ? item.requiredDocuments.find((doc) => doc.name === requiredDocumentName) : null;

  for (const file of files) {
    const error = await validateUpload(file);
    if (error) return { error };
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveLocalUpload(file, item.id);
    const document = await prisma.uploadedDocument.create({
      data: {
        firmId: item.firmId,
        clientCollectionId: item.id,
        requiredDocumentId: targetDoc?.id || null,
        originalFileName: file.name,
        storageKey: saved.storageKey,
        mimeType: file.type,
        size: saved.size,
        clientAcknowledgedDelayRisk: true,
        clientAcknowledgedAt: new Date(),
        clientAcknowledgementText: clientUploadProofText,
        uploadedByName: text(formData, "uploadedByName"),
        uploaderComment: text(formData, "uploaderComment")
      }
    });
    // The file is already saved and visible to the firm at this point —
    // don't make the client's "upload confirmed" response wait on the
    // antivirus scan (a network round-trip to ClamAV, up to 15s per file).
    // That used to leave the upload page showing "uploading" long after the
    // file had actually arrived. Downloads stay blocked until the scan
    // completes (canDownloadScannedDocument), so this doesn't weaken the
    // fail-closed guarantee — it just stops the scan from gating the
    // upload confirmation itself.
    scanUploadedFile({ documentId: document.id, firmId: item.firmId, bytes }).catch((error) =>
      logServerError({ error, firmId: item.firmId, metadata: { documentId: document.id, context: "background-document-scan" } })
    );
    await recordOperationalEvent({
      firmId: item.firmId,
      actorType: OperationalActorType.CLIENT,
      clientId: item.clientId,
      collectionId: item.collectionPeriodId,
      clientCollectionId: item.id,
      obligationId: targetDoc?.id || null,
      documentId: document.id,
      eventType: "DOCUMENT_UPLOADED",
      eventTitle: "Document dépose",
      eventDescription: `${file.name} dépose par le client.`,
      metadata: {
        originalFileName: file.name,
        size: saved.size,
        mimeType: file.type,
        requiredDocumentId: targetDoc?.id || null,
        requiredDocumentName: targetDoc?.name || null
      },
      source: "PUBLIC_UPLOAD_FORM"
    });
  }
  if (targetDoc) {
    await prisma.requiredDocument.update({ where: { id: targetDoc.id }, data: { status: "RECEIVED" } });
  }
  await prisma.clientCollection.update({
    where: { id: item.id },
    data: {
      completionConfirmedAt: new Date(),
      completionConfirmationText: clientCompletionConfirmationText
    }
  });
  await recalculateClientCollectionStatus(item.id);
  revalidatePath(`/upload/${token}`);
  return { ok: true };
}

export async function updateSettingsAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const docs = String(formData.get("defaultRequiredDocuments") || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  await prisma.firm.update({
    where: { id: user.firmId },
    data: {
      name: text(formData, "name") || user.firm.name,
      city: text(formData, "city"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      logoUrl: text(formData, "logoUrl"),
      defaultRequiredDocuments: requiredDocumentsFromFirm(docs),
      reminderTemplate: text(formData, "reminderTemplate")
    }
  });
  revalidatePath("/app/settings");
}

export async function updateFiscalConfigAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const frequencyValue = text(formData, "defaultTvaFrequency") || FiscalFrequency.MONTHLY;
  const defaultTvaFrequency = Object.values(FiscalFrequency).includes(frequencyValue as FiscalFrequency)
    ? (frequencyValue as FiscalFrequency)
    : FiscalFrequency.MONTHLY;
  const declarationDay = boundedIntegerValue(formData, "defaultDeclarationDay", 1, 31, 20) || 20;
  const paymentDay = boundedIntegerValue(formData, "defaultPaymentDay", 1, 31, 25) || 25;

  await prisma.fiscalConfig.upsert({
    where: { firmId: user.firmId },
    update: {
      countryCode: text(formData, "countryCode") || "MA",
      defaultCurrency: text(formData, "defaultCurrency") || "MAD",
      defaultTvaFrequency,
      defaultDeclarationDay: declarationDay,
      defaultPaymentDay: paymentDay
    },
    create: {
      firmId: user.firmId,
      countryCode: text(formData, "countryCode") || "MA",
      defaultCurrency: text(formData, "defaultCurrency") || "MAD",
      defaultTvaFrequency,
      defaultDeclarationDay: declarationDay,
      defaultPaymentDay: paymentDay
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "FISCAL_CONFIG_UPDATED",
    eventTitle: "Configuration fiscale mise a jour",
    eventDescription: "Les regles TVA du cabinet ont été mises a jour.",
    metadata: { defaultTvaFrequency, declarationDay, paymentDay },
    source: "APP_FISCAL_CONFIG"
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/fiscal-config");
}

export async function createTvaRateAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const label = text(formData, "label");
  const rate = numberValue(formData, "rate");
  if (!label || rate == null || rate < 0) return;
  const isDefault = formData.get("isDefault") === "on";

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.tvaRate.updateMany({ where: { firmId: user.firmId }, data: { isDefault: false } });
    }
    await tx.tvaRate.create({
      data: {
        firmId: user.firmId,
        label,
        rate,
        isDefault,
        isActive: formData.get("isActive") !== "off"
      }
    });
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "TVA_RATE_CREATED",
    eventTitle: "Taux TVA ajoute",
    eventDescription: `${label}: ${rate}%.`,
    metadata: { label, rate, isDefault },
    source: "APP_FISCAL_CONFIG"
  });
  revalidatePath("/app/settings/fiscal-config");
}

export async function createFiscalRegimeAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const name = text(formData, "name");
  if (!name) return;
  const frequencyValue = text(formData, "frequency") || FiscalFrequency.MONTHLY;
  const frequency = Object.values(FiscalFrequency).includes(frequencyValue as FiscalFrequency)
    ? (frequencyValue as FiscalFrequency)
    : FiscalFrequency.MONTHLY;

  await prisma.fiscalRegime.create({
    data: {
      firmId: user.firmId,
      name,
      description: text(formData, "description"),
      frequency,
      isActive: formData.get("isActive") !== "off"
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    eventType: "FISCAL_REGIME_CREATED",
    eventTitle: "Regime fiscal ajoute",
    eventDescription: `${name} a été ajoute aux regimes du cabinet.`,
    metadata: { name, frequency },
    source: "APP_FISCAL_CONFIG"
  });
  revalidatePath("/app/settings/fiscal-config");
}

export async function updateClientFiscalProfileAction(clientId: string, formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
  if (!client) return;

  const frequencyValue = text(formData, "tvaFrequency") || ClientTvaFrequency.MONTHLY;
  const tvaFrequency = Object.values(ClientTvaFrequency).includes(frequencyValue as ClientTvaFrequency)
    ? (frequencyValue as ClientTvaFrequency)
    : ClientTvaFrequency.MONTHLY;
  const riskValue = text(formData, "fiscalRiskLevel") || FiscalSeverity.LOW;
  const fiscalRiskLevel = Object.values(FiscalSeverity).includes(riskValue as FiscalSeverity) ? (riskValue as FiscalSeverity) : FiscalSeverity.LOW;
  const tvaRegimeId = text(formData, "tvaRegimeId");
  const validRegime = tvaRegimeId
    ? await prisma.fiscalRegime.findFirst({ where: { id: tvaRegimeId, firmId: user.firmId } })
    : null;
  const assignedAccountantId = text(formData, "assignedAccountantId");
  const validAccountant = assignedAccountantId
    ? await prisma.user.findFirst({ where: { id: assignedAccountantId, firmId: user.firmId } })
    : null;

  const data = {
    firmId: user.firmId,
    clientId,
    ice: text(formData, "ice"),
    identifiantFiscal: text(formData, "identifiantFiscal"),
    registreCommerce: text(formData, "registreCommerce"),
    cnssNumber: text(formData, "cnssNumber"),
    tvaRegimeId: validRegime?.id || null,
    tvaFrequency,
    declarationDayOverride: boundedIntegerValue(formData, "declarationDayOverride", 1, 31),
    paymentDayOverride: boundedIntegerValue(formData, "paymentDayOverride", 1, 31),
    fiscalRiskLevel,
    assignedAccountantId: validAccountant?.id || null,
    notes: text(formData, "notes")
  };

  await prisma.clientFiscalProfile.upsert({
    where: { clientId },
    update: data,
    create: data
  });
  await prisma.client.updateMany({
    where: { id: clientId, firmId: user.firmId },
    data: {
      ice: data.ice,
      taxId: data.identifiantFiscal
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId,
    eventType: "CLIENT_FISCAL_PROFILE_UPDATED",
    eventTitle: "Profil fiscal client mis a jour",
    eventDescription: `Profil fiscal mis a jour pour ${client.companyName}.`,
    metadata: { tvaFrequency, fiscalRiskLevel, tvaRegimeId: data.tvaRegimeId },
    source: "APP_CLIENT_FISCAL_PROFILE"
  });
  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath(`/app/clients/${clientId}/fiscal-profile`);
}

