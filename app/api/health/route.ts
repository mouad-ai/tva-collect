import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      version: process.env.npm_package_version || "0.1.0",
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({ status: "error", database: "error", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
