import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";
import { externalUrlForRequest } from "@/lib/routing";

export async function POST(request: Request) {
  const response = NextResponse.redirect(externalUrlForRequest(request, "/login"), 303);
  response.cookies.delete(cookieName);
  return response;
}
