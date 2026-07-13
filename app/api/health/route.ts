import { NextResponse } from "next/server";
import { checkStorageHealth } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();
  // The overall status/HTTP code intentionally reflects DATABASE only — this
  // endpoint gates the Docker container healthcheck (scripts/docker-healthcheck.mjs)
  // and the pre-deploy check (scripts/production-check.ts), both of which
  // expect a hard 200/503. A transient storage blip shouldn't flip the whole
  // container to "unhealthy" and risk a restart-loop when the app itself is
  // otherwise serving fine — storage is reported for visibility instead.
  let database: "ok" | "error" = "error";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    database = "error";
  }
  const storage = await checkStorageHealth();
  return NextResponse.json(
    { status: database === "ok" ? "ok" : "degraded", database, storage: storage.ok ? "ok" : "error", storageDetail: storage.detail, timestamp },
    { status: database === "ok" ? 200 : 503 }
  );
}
