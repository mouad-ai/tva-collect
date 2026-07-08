"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auditEvent } from "@/lib/audit";
import { canManageTeam, requireFirmAnyRole, revokeUserSessions } from "@/lib/auth";
import { requireWithinPlanLimit } from "@/lib/billing";
import { createUserInvite } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function inviteTeamUserAction(formData: FormData) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (!canManageTeam(user.role)) return;
  await requireWithinPlanLimit(user.firmId, "users");
  const role = String(formData.get("role") || "") as UserRole;
  const allowedInviteRoles: UserRole[] = [UserRole.MANAGER, UserRole.ASSISTANT, UserRole.READ_ONLY];
  if (!allowedInviteRoles.includes(role)) return;
  if (user.role === UserRole.MANAGER && role === UserRole.MANAGER) return;
  const email = text(formData, "email")?.toLowerCase();
  const name = text(formData, "name");
  if (!email || !name) return;
  await prisma.user.upsert({
    where: { email },
    update: { firmId: user.firmId, name, role, isActive: false },
    create: { email, name, firmId: user.firmId, role, isActive: false }
  });
  const invite = await createUserInvite({ firmId: user.firmId, email, name, role, createdByUserId: user.id });
  await auditEvent({ action: "team.invited", firmId: user.firmId, userId: user.id, entityType: "UserInvite", entityId: invite.invite.id });
  revalidatePath("/app/settings/team");
}

export async function revokeInviteAction(inviteId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  await prisma.userInvite.updateMany({
    where: { id: inviteId, firmId: user.firmId, acceptedAt: null },
    data: { revokedAt: new Date() }
  });
  await auditEvent({ action: "team.invite_revoked", firmId: user.firmId, userId: user.id, entityType: "UserInvite", entityId: inviteId });
  revalidatePath("/app/settings/team");
}

export async function setUserActiveAction(targetUserId: string, isActive: boolean) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  const target = await prisma.user.findFirst({ where: { id: targetUserId, firmId: user.firmId } });
  if (!target) return;
  if (target.role === UserRole.OWNER && !isActive) {
    const owners = await prisma.user.count({ where: { firmId: user.firmId, role: UserRole.OWNER, isActive: true } });
    if (owners <= 1) return;
  }
  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive, disabledAt: isActive ? null : new Date(), disabledReason: isActive ? null : "Désactivé par administrateur cabinet" }
  });
  if (!isActive) await revokeUserSessions(targetUserId);
  await auditEvent({ action: isActive ? "team.user_enabled" : "team.user_disabled", firmId: user.firmId, userId: user.id, entityType: "User", entityId: targetUserId });
  revalidatePath("/app/settings/team");
}

export async function transferOwnershipAction(targetUserId: string) {
  const user = await requireFirmAnyRole([UserRole.OWNER]);
  const target = await prisma.user.findFirst({ where: { id: targetUserId, firmId: user.firmId, isActive: true } });
  if (!target) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { role: UserRole.OWNER } }),
    prisma.user.update({ where: { id: user.id }, data: { role: UserRole.MANAGER } })
  ]);
  await auditEvent({ action: "team.ownership_transferred", firmId: user.firmId, userId: user.id, entityType: "User", entityId: targetUserId });
  revalidatePath("/app/settings/team");
}
