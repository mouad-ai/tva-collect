import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { hashToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function inviteUrl(token: string) {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/invite/${token}`;
}

export async function createUserInvite(input: {
  firmId: string;
  email: string;
  name: string;
  role: UserRole;
  createdByUserId?: string | null;
  expiresInDays?: number;
}) {
  const token = createInviteToken();
  const invite = await prisma.userInvite.create({
    data: {
      firmId: input.firmId,
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + (input.expiresInDays || 7) * 24 * 60 * 60 * 1000),
      createdByUserId: input.createdByUserId || null
    }
  });
  await sendEmail({
    to: invite.email,
    subject: "Invitation TVA Collect",
    template: "team-invite",
    variables: { name: invite.name, inviteLink: inviteUrl(token), role: invite.role }
  });
  return { invite, token };
}
