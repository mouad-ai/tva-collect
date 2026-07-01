import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok", timestamp });
  } catch {
    return NextResponse.json({ status: "degraded", database: "error", timestamp }, { status: 503 });
  }
}
