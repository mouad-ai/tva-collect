import { NextResponse, type NextRequest } from "next/server";
import {
  adminHost,
  adminInternalBase,
  appHost,
  appInternalBase,
  hostUrl,
  isAdminHost,
  isAppHost,
  isLocalHost,
  isPublicHost,
  stripBase,
  withBase,
  type RouteZone
} from "@/lib/routing";

const sessionCookieName = "tva_session";

function isPublicRuntimePath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    // Public client upload page: must render on ANY host (www, app, admin) so that
    // both canonical links and legacy app-domain links resolve instead of 404ing.
    pathname === "/upload" ||
    pathname.startsWith("/upload/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isAuthPage(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/invite/")
  );
}

function requestHeaders(request: NextRequest, zone: RouteZone, visibleBase: string, internalPathname?: string) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  headers.set("x-route-zone", zone);
  headers.set("x-visible-base", visibleBase);
  if (internalPathname) headers.set("x-internal-pathname", internalPathname);
  return headers;
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

function rewriteTo(request: NextRequest, internalPathname: string, zone: RouteZone, visibleBase: string) {
  const url = request.nextUrl.clone();
  url.pathname = internalPathname;
  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders(request, zone, visibleBase, internalPathname)
    }
  });
}

function nextWithZone(request: NextRequest, zone: RouteZone, visibleBase: string) {
  return NextResponse.next({
    request: {
      headers: requestHeaders(request, zone, visibleBase)
    }
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host");
  const hasSession = Boolean(request.cookies.get(sessionCookieName));

  if (isPublicRuntimePath(pathname)) {
    return nextWithZone(request, "public", "");
  }

  // A GET/HEAD hitting a URL that still carries the internal /app or /admin
  // prefix on its own host (stale link, bookmark, typed URL) is redirected to
  // the clean canonical URL. A POST — most importantly a Server Action call,
  // which fetches whatever URL is currently in the address bar — must NOT be
  // redirected here: redirecting a POST means the browser has to replay the
  // request body, and Server Action bodies are streamed and cannot be
  // replayed, so the request just hangs forever (reported as "307, stuck
  // pending"). For non-GET requests, serve the route in place instead.
  const isSafeMethod = request.method === "GET" || request.method === "HEAD";

  if (isAppHost(host)) {
    if (pathname.startsWith(adminInternalBase)) {
      if (!isSafeMethod) return rewriteTo(request, pathname, "admin", "");
      return NextResponse.redirect(hostUrl(request.url, adminHost(), stripBase(pathname, adminInternalBase)));
    }
    if (pathname.startsWith(appInternalBase)) {
      if (!isSafeMethod) {
        const cleanPath = stripBase(pathname, appInternalBase);
        if (isAuthPage(cleanPath)) return nextWithZone(request, "public", "");
        if (!hasSession) return redirectToLogin(request);
        return rewriteTo(request, pathname, "app", "");
      }
      return NextResponse.redirect(new URL(stripBase(pathname, appInternalBase), request.url));
    }
    if (isAuthPage(pathname)) return nextWithZone(request, "public", "");
    if (!hasSession) return redirectToLogin(request);
    return rewriteTo(request, withBase(appInternalBase, pathname), "app", "");
  }

  if (isAdminHost(host)) {
    if (pathname.startsWith(appInternalBase)) {
      if (!isSafeMethod) return rewriteTo(request, pathname, "app", "");
      return NextResponse.redirect(hostUrl(request.url, appHost(), stripBase(pathname, appInternalBase)));
    }
    if (pathname.startsWith(adminInternalBase)) {
      if (!isSafeMethod) {
        const cleanPath = stripBase(pathname, adminInternalBase);
        if (isAuthPage(cleanPath)) return nextWithZone(request, "public", "");
        if (!hasSession) return redirectToLogin(request);
        return rewriteTo(request, pathname, "admin", "");
      }
      return NextResponse.redirect(new URL(stripBase(pathname, adminInternalBase), request.url));
    }
    if (isAuthPage(pathname)) return nextWithZone(request, "public", "");
    if (!hasSession) return redirectToLogin(request);
    return rewriteTo(request, withBase(adminInternalBase, pathname), "admin", "");
  }

  if (isPublicHost(host)) {
    // Authentication lives on the app domain only. Anyone landing on an auth page
    // of the public marketing domain (e.g. www.tvacollect.com/login) is redirected
    // to the same path on the app domain so login happens exactly once.
    if (isAuthPage(pathname)) {
      const target = hostUrl(request.url, appHost(), pathname);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target);
    }
    if (pathname.startsWith(appInternalBase)) {
      return NextResponse.redirect(hostUrl(request.url, appHost(), stripBase(pathname, appInternalBase)));
    }
    if (pathname.startsWith(adminInternalBase)) {
      return NextResponse.redirect(hostUrl(request.url, adminHost(), stripBase(pathname, adminInternalBase)));
    }
  }

  if (isLocalHost(host)) {
    if (pathname.startsWith(appInternalBase)) {
      if (!hasSession) return redirectToLogin(request);
      return nextWithZone(request, "app", appInternalBase);
    }
    if (pathname.startsWith(adminInternalBase)) {
      if (!hasSession) return redirectToLogin(request);
      return nextWithZone(request, "admin", adminInternalBase);
    }
  }

  return nextWithZone(request, "public", "");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"]
};
