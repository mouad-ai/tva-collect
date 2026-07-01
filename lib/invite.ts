import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { hashToken } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
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
  createdByUserId: string;
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
      createdByUserId: input.createdByUserId
    }
  });
  await sendInviteEmail({
    to: invite.email,
    name: invite.name,
    firmName: "TVA Collect",
    inviteLink: inviteUrl(token)
  });
  return { invite, token };
}
