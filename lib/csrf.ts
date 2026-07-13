import { NextResponse } from "next/server";

/**
 * Same-origin check for cookie-authenticated, state-changing API route
 * handlers. Next.js Server Actions already get automatic origin
 * verification from the framework (next.config.ts has no
 * experimental.serverActions.allowedOrigins override, so the default
 * same-origin enforcement applies) — this fills the same gap for plain
 * app/api/** route handlers, which do not get that protection.
 *
 * Compares Origin (falling back to Referer) against the request's own
 * Host/X-Forwarded-Host, so it works correctly across app./admin./www.
 * without hardcoding a domain allowlist.
 */
export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    return false;
  }
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return Boolean(requestHost) && sourceHost === requestHost;
}

export function rejectCrossOrigin() {
  return NextResponse.json({ error: "Origine de la requête invalide." }, { status: 403 });
}
