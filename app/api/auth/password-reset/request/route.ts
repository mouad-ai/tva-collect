import { NextResponse } from "next/server";
import { z } from "zod";
import { auditEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { generatePasswordResetToken, passwordResetExpiresAt, passwordResetUrl } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: true });
  const email = body.data.email.toLowerCase();
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `password-reset:ip:${rateLimitIp(request)}`, limit: 8, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `password-reset:email:${email}`, limit: 3, windowMs: 15 * 60 * 1000 })
  ]);
  if (!byIp.allowed || !byEmail.allowed) return NextResponse.json({ ok: true });
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const { token, tokenHash } = generatePasswordResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: passwordResetExpiresAt() }
      })
    ]);
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink: passwordResetUrl(token) });
    await auditEvent({ action: "password_reset.requested", firmId: user.firmId, userId: user.id, request });
  }
  return NextResponse.json({ ok: true });
}
