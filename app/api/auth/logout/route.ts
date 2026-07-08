import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";
import { externalUrlForRequest, requestHost, sessionCookieDomain } from "@/lib/routing";

export async function POST(request: Request) {
  const response = NextResponse.redirect(externalUrlForRequest(request, "/login"), 303);
  // Overwrite with an expired cookie using the SAME domain so a subdomain-shared
  // session (Domain=.tvacollect.com) is actually cleared, not just the host-only one.
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: sessionCookieDomain(requestHost(request)),
    maxAge: 0
  });
  return response;
}
