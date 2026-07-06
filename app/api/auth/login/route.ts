import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { postLoginDestination } from "@/lib/security-policy";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

async function handlePOST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }
  const ip = rateLimitIp(request);
  const email = body.data.email.toLowerCase();
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `login:ip:${ip}`, limit: 12, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `login:email:${email}`, limit: 6, windowMs: 15 * 60 * 1000 })
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 429 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    },
    include: { firm: true }
  });
  if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const destination = postLoginDestination(user);
  if (!destination.ok) {
    console.warn("Login blocked for account without valid destination", {
      userId: user.id,
      role: user.role,
      firmId: user.firmId
    });
    return NextResponse.json({ error: "Compte actif mais incomplet." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: destination.redirectTo });
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
