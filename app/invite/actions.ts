"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { auditEvent } from "@/lib/audit";
import { hashToken, revokeUserSessions } from "@/lib/auth";
import { assertStrongPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function acceptInviteAction(token: string, formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password !== confirmPassword) return { error: "Les mots de passe ne correspondent pas." };
  try {
    assertStrongPassword(password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Mot de passe invalide." };
  }

  const invite = await prisma.userInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return { error: "Invitation invalide ou expiree." };
  }

  const user = await prisma.user.update({
    where: { email: invite.email },
    data: {
      name: invite.name || invite.email,
      firmId: invite.firmId,
      role: invite.role,
      passwordHash: await bcrypt.hash(password, 12),
      isActive: true,
      disabledAt: null,
      disabledReason: null
    }
  });
  await prisma.userInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await revokeUserSessions(user.id);
  await auditEvent({ action: "invite.accepted", firmId: invite.firmId, userId: user.id, entityType: "UserInvite", entityId: invite.id });
  redirect("/login");
}
