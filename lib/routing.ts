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
  url.hostname = normalizeHost(targetHost);
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

function hostFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}
