import { createHash, randomBytes } from "crypto";

export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function inviteUrl(token: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export function passwordStrengthError(password: string) {
  if (password.length < 12) return "Le mot de passe doit contenir au moins 12 caracteres.";
  if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir une lettre minuscule.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir une lettre majuscule.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir un chiffre.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Le mot de passe doit contenir un caractere special.";
  return null;
}
