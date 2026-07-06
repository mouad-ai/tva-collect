import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if ((pathname.startsWith("/app") || pathname.startsWith("/admin")) && !request.cookies.get("tva_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app", "/app/:path*", "/admin", "/admin/:path*"]
};
