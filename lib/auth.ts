import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const cookieName = "tva_session";

function secret() {
  return process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, createdAt: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string };
    return decoded.userId || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const userId = verifySessionToken(store.get(cookieName)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { firm: true }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdminEmail(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "demo@tvacollect.ma";
  return email.toLowerCase() === adminEmail.toLowerCase();
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/app");
  return user;
}

export { cookieName };
