import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { postLoginRedirectForRole } from "@/lib/security-policy";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function handlePOST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }
  const ip = rateLimitIp(request);
  const emailKey = body.data.email.toLowerCase();
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `login:ip:${ip}`, limit: 12, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `login:email:${emailKey}`, limit: 6, windowMs: 15 * 60 * 1000 })
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: postLoginRedirectForRole(user.role) });
  response.cookies.set(cookieName, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}

export async function POST(request: Request) {
  try {
    return await handlePOST(request);
  } catch (error) {
    return loggedApiError(error, request);
  }
}
