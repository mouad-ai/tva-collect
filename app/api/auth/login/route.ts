import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieName, createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user || !(await bcrypt.compare(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
