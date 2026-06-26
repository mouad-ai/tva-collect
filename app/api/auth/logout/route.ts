import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  response.cookies.delete(cookieName);
  return response;
}
