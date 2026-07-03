import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { FirmStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const cookieName = "tva_session";
const defaultSessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const defaultIdleTimeoutSeconds = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  createdAt: number;
  lastActivityAt: number;
};

function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured in production.");
  }
  return value || "local-dev-explicit-session-secret";
}

function sessionMaxAgeSeconds() {
  return Number(process.env.SESSION_MAX_AGE_SECONDS || defaultSessionMaxAgeSeconds);
}

function idleTimeoutMs() {
  return Number(process.env.SESSION_IDLE_TIMEOUT_SECONDS || defaultIdleTimeoutSeconds) * 1000;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createRawToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(userId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, createdAt: now, lastActivityAt: now })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): { userId: string; shouldRefresh: boolean } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof decoded.userId !== "string" || typeof decoded.createdAt !== "number") return null;
    const lastActivityAt = typeof decoded.lastActivityAt === "number" ? decoded.lastActivityAt : decoded.createdAt;
    const now = Date.now();
    if (now - decoded.createdAt > sessionMaxAgeSeconds() * 1000) return null;
    if (now - lastActivityAt > idleTimeoutMs()) return null;
    return { userId: decoded.userId, shouldRefresh: now - lastActivityAt > 60_000 };
  } catch {
    return null;
  }
}

async function clearSessionCookie() {
  try {
    const store = await cookies();
    store.delete(cookieName);
  } catch {
    // Server components can be read-only; route handlers/actions will clear it.
  }
}

async function refreshSessionCookie(userId: string) {
  try {
    const store = await cookies();
    store.set(cookieName, createSessionToken(userId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds()
    });
  } catch {
    // Best effort refresh for contexts where cookie mutation is allowed.
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = verifySessionToken(store.get(cookieName)?.value);
  if (!session) {
    await clearSessionCookie();
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { firm: true }
  });
  if (!user || !user.isActive) {
    await clearSessionCookie();
    return null;
  }
  if (session.shouldRefresh) await refreshSessionCookie(session.userId);
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasAnyRole(user: { role: UserRole }, roles: UserRole[]) {
  return roles.includes(user.role);
}

export function canAccessBilling(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

export function canManageTeam(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

export async function revokeUserSessions(_userId: string) {
  return;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/app");
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (user.role !== role) redirect("/app");
  return user;
}

export async function requireAnyRole(roles: UserRole[]) {
  const user = await requireUser();
  if (!hasAnyRole(user, roles)) redirect("/app");
  return user;
}

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type FirmUser = CurrentUser & { firmId: string; firm: NonNullable<CurrentUser["firm"]> };

function appPathAllowsSuspendedFirm(pathname: string | null) {
  return pathname?.startsWith("/app/billing") || pathname?.startsWith("/app/suspended");
}

export async function requireFirmUser() {
  const user = await requireUser();
  if (user.role === UserRole.ADMIN || !user.firmId || !user.firm) redirect("/login");
  if (user.firm.status === FirmStatus.SUSPENDED || user.firm.status === FirmStatus.CANCELLED) {
    const pathname = (await headers()).get("x-pathname");
    if (!appPathAllowsSuspendedFirm(pathname)) redirect("/app/suspended");
  }
  return user as FirmUser;
}

export async function requireFirmAnyRole(roles: UserRole[]) {
  const user = await requireFirmUser();
  if (!hasAnyRole(user, roles)) redirect("/app");
  return user;
}

export async function requireMutableFirmUser() {
  return requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.ASSISTANT]);
}

export { cookieName };
