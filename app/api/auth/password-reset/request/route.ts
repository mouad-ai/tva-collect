import { NextResponse } from "next/server";
import { z } from "zod";
import { auditEvent } from "@/lib/audit";
import { createRawToken, hashToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  if (!rateLimit(`password-reset:${getClientIp(request)}`, 5, 60_000).allowed) {
    return NextResponse.json({ ok: true });
  }
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: true });
  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (user?.isActive) {
    const token = createRawToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    });
    const resetLink = `${process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/password-reset/${token}`;
    await sendEmail({ to: user.email, subject: "Reinitialisation mot de passe", template: "password-reset", variables: { name: user.name, resetLink } });
    await auditEvent({ action: "password_reset.requested", firmId: user.firmId, userId: user.id, request });
  }
  return NextResponse.json({ ok: true });
}
