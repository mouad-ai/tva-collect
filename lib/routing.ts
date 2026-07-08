export type RouteZone = "public" | "app" | "admin";

export const appInternalBase = "/app";
export const adminInternalBase = "/admin";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function normalizeHost(hostHeader: string | null | undefined) {
  return (hostHeader || "").split(":")[0].toLowerCase();
}

export function isLocalHost(hostHeader: string | null | undefined) {
  return localHosts.has(normalizeHost(hostHeader));
}

export function appHost() {
  return process.env.APP_HOST || hostFromUrl(process.env.APP_URL) || "app.tvacollect.com";
}

export function adminHost() {
  return process.env.ADMIN_HOST || hostFromUrl(process.env.ADMIN_URL) || "admin.tvacollect.com";
}

export function publicHost() {
  return process.env.PUBLIC_HOST || hostFromUrl(process.env.PUBLIC_URL) || "tvacollect.com";
}

export function isAppHost(hostHeader: string | null | undefined) {
  const host = normalizeHost(hostHeader);
  return !isLocalHost(host) && host === normalizeHost(appHost());
}

export function isAdminHost(hostHeader: string | null | undefined) {
  const host = normalizeHost(hostHeader);
  return !isLocalHost(host) && host === normalizeHost(adminHost());
}

export function isPublicHost(hostHeader: string | null | undefined) {
  const host = normalizeHost(hostHeader);
  const configured = normalizeHost(publicHost());
  return !isLocalHost(host) && (host === configured || host === `www.${configured}`);
}

/**
 * Canonical base URL (scheme + host, no trailing slash) for each zone.
 * Upload/share links MUST use the public base because the /upload/[token]
 * route is a public page served on the marketing domain.
 */
export function publicBaseUrl() {
  const explicit = process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return `https://${publicHost()}`;
}

export function appBaseUrl() {
  const explicit = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return `https://${appHost()}`;
}

/**
 * Login URL used by public marketing "Connexion" buttons. Resolves to the app
 * domain (e.g. https://app.tvacollect.com/login) from APP_URL so there is no
 * intermediate www/login → app/login hop. Falls back to a relative "/login" for
 * local dev (single origin) or when APP_URL is unset/localhost — which still
 * works and is caught by the proxy's public→app auth redirect as a safety net.
 */
export function appLoginHref() {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!base) return "/login";
  try {
    const url = new URL(base);
    if (isLocalHost(url.hostname)) return "/login";
    return `${url.origin}/login`;
  } catch {
    return "/login";
  }
}

/** Best available external host for the request (honours reverse-proxy headers). */
export function requestHost(request: Request) {
  return firstForwardedValue(request.headers.get("x-forwarded-host")) || request.headers.get("host");
}

/**
 * Domain attribute for the session cookie so a single login is shared across
 * app/admin/www subdomains. Returns undefined on localhost (host-only cookie).
 */
export function sessionCookieDomain(hostHeader: string | null | undefined) {
  const explicit = process.env.SESSION_COOKIE_DOMAIN;
  if (explicit) return explicit;
  const host = normalizeHost(hostHeader);
  if (!host || isLocalHost(host)) return undefined;
  const parent = normalizeHost(publicHost());
  if (parent && (host === parent || host.endsWith(`.${parent}`))) {
    return `.${parent}`;
  }
  return undefined;
}

export function stripBase(pathname: string, base: string) {
  if (pathname === base) return "/";
  if (!pathname.startsWith(`${base}/`)) return pathname;
  return pathname.slice(base.length) || "/";
}

export function withBase(base: string, pathname: string) {
  if (pathname === "/" || pathname === "") return base;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function hrefForBase(basePath: string, path = "") {
  const cleanPath = path && path !== "/" ? (path.startsWith("/") ? path : `/${path}`) : "";
  if (!basePath) return cleanPath || "/";
  return `${basePath}${cleanPath}`;
}

export function hostUrl(requestUrl: string, targetHost: string, pathname = "/") {
  const url = new URL(requestUrl);
  const normalizedTarget = targetHost.trim().toLowerCase();
  if (normalizedTarget.includes(":")) {
    url.host = normalizedTarget;
  } else {
    url.hostname = normalizeHost(normalizedTarget);
    url.port = "";
  }
  url.pathname = pathname;
  url.search = "";
  return url;
}

export function cleanDestinationForRequest(requestUrl: string, internalDestination: string) {
  const url = new URL(requestUrl);
  const host = url.host;

  if (internalDestination === appInternalBase || internalDestination.startsWith(`${appInternalBase}/`)) {
    const cleanPath = stripBase(internalDestination, appInternalBase);
    if (isAppHost(host)) return cleanPath;
    if (isLocalHost(host)) return internalDestination;
    return hostUrl(requestUrl, appHost(), cleanPath).toString();
  }

  if (internalDestination === adminInternalBase || internalDestination.startsWith(`${adminInternalBase}/`)) {
    const cleanPath = stripBase(internalDestination, adminInternalBase);
    if (isAdminHost(host)) return cleanPath;
    if (isLocalHost(host)) return internalDestination;
    return hostUrl(requestUrl, adminHost(), cleanPath).toString();
  }

  return internalDestination;
}

export function externalUrlForRequest(request: Request, pathname = "/", search = "") {
  const internalUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const host = forwardedHost || request.headers.get("host") || internalUrl.host;
  const protocol = forwardedProto || internalUrl.protocol.replace(":", "") || "https";
  const url = new URL(`${protocol}://${host}`);
  url.pathname = pathname;
  url.search = search;
  return url;
}

function hostFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}
