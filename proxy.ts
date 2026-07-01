import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const protectedArea = request.nextUrl.pathname.startsWith("/app") || request.nextUrl.pathname.startsWith("/admin");
  if (protectedArea && !request.cookies.get("tva_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"]
};
