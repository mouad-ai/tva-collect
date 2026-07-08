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
