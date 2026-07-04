import { NextResponse, type NextRequest } from "next/server";

const publicPrefixes = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/upload",
  "/api/auth",
  "/api/public",
  "/api/health"
];

function isPublicPath(pathname: string) {
  return pathname === "/" || publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const protectedArea = pathname.startsWith("/app") || pathname.startsWith("/admin");
  if (protectedArea && !request.cookies.get("tva_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"]
};
