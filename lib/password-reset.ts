import { createHash, randomBytes } from "crypto";

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetExpiresAt(hours = 1) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function passwordResetUrl(token: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/reset-password/${token}`;
}

export function isPasswordResetUsable(input: { expiresAt: Date; usedAt?: Date | null }, now = new Date()) {
  return !input.usedAt && input.expiresAt > now;
}
