import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium" }).format(new Date(date));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

/**
 * Normalizes a stored phone number to a WhatsApp-compatible digits-only
 * international number (no leading "+"). Assumes Moroccan local formats
 * ("0612345678", "06 12 34 56 78") when no country code is present, since
 * that's what cabinets enter for their clients. Returns null when the value
 * doesn't look like a usable phone number.
 */
export function whatsAppPhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("212") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `212${digits.slice(1)}`;
  if (digits.length === 9 && /^[5-7]/.test(digits)) return `212${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

export function whatsAppLink(phone: string | null | undefined, message: string) {
  const formatted = whatsAppPhone(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function uploadUrl(token: string) {
  // Client upload pages live on the PUBLIC marketing domain (www/tvacollect.com),
  // not on the authenticated app domain. Prefer the public base URL so shared
  // links never resolve to app.tvacollect.com (which would 404 / require login).
  const base =
    process.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/upload/${token}`;
}
