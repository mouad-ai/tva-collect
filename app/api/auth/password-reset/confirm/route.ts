import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditEvent } from "@/lib/audit";
import { revokeUserSessions } from "@/lib/auth";
import { validatePasswordStrength } from "@/lib/password";
import { hashPasswordResetToken, isPasswordResetUsable } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(20), password: z.string(), confirmPassword: z.string() });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.password !== body.data.confirmPassword) {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  }
  const errors = validatePasswordStrength(body.data.password);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashPasswordResetToken(body.data.token) }, include: { user: true } });
  if (!reset || !isPasswordResetUsable(reset) || !reset.user.isActive) {
    return NextResponse.json({ error: "Lien invalide ou expire." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(body.data.password, 12), isActive: true } });
  await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  await revokeUserSessions(reset.userId);
  await auditEvent({ action: "password_reset.completed", firmId: reset.user.firmId, userId: reset.userId, request });
  return NextResponse.redirect(new URL("/login?reset=success", request.url), { status: 303 });
}
