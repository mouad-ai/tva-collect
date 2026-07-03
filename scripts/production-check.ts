import { PrismaClient, UserRole } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const checks: Check[] = [];
const weakValues = new Set([
  "",
  "change-me",
  "change-me-long-random-secret",
  "change-this-very-long-random-secret",
  "dev-secret-change-me",
  "password",
  "password123",
  "postgres",
  "admin",
  "example",
  "smtp.example.com"
]);

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

function env(name: string) {
  return process.env[name] || "";
}

function strong(name: string, minLength = 32) {
  const value = env(name);
  const normalized = value.trim().toLowerCase();
  return Boolean(value && value.length >= minLength && !weakValues.has(normalized) && !normalized.includes("change-this"));
}

function required(name: string) {
  const value = env(name).trim();
  return Boolean(value && !weakValues.has(value.toLowerCase()) && !value.toLowerCase().includes("change-this"));
}

function validProductionUrl(name: string) {
  try {
    const url = new URL(env(name));
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function prismaMigrateStatus() {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
      timeout: 30_000
    });
    const output = `${stdout}\n${stderr}`;
    return {
      ok: output.includes("Database schema is up to date"),
      detail: output.split(/\r?\n/).filter(Boolean).slice(-4).join(" | ")
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function httpHealth() {
  const baseUrl = env("APP_URL") || env("NEXTAUTH_URL");
  if (!baseUrl) return { ok: false, detail: "APP_URL/NEXTAUTH_URL missing" };
  try {
    const response = await fetch(new URL("/api/health", baseUrl), { method: "GET" });
    const body = await response.text();
    return { ok: response.ok && body.includes("\"database\":\"ok\""), detail: `${response.status} ${body.slice(0, 160)}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  add("NODE_ENV production", env("NODE_ENV") === "production", env("NODE_ENV") || "missing");
  add("DATABASE_URL present", required("DATABASE_URL"), env("DATABASE_URL") ? "configured" : "missing");
  add("AUTH_SECRET strong", strong("AUTH_SECRET"), env("AUTH_SECRET") ? `${env("AUTH_SECRET").length} chars` : "missing");
  add("NEXTAUTH_SECRET strong", strong("NEXTAUTH_SECRET"), env("NEXTAUTH_SECRET") ? `${env("NEXTAUTH_SECRET").length} chars` : "missing");
  add("APP_URL https", validProductionUrl("APP_URL"), env("APP_URL") || "missing");
  add("NEXTAUTH_URL https", validProductionUrl("NEXTAUTH_URL"), env("NEXTAUTH_URL") || "missing");
  add("UPLOAD_STORAGE s3-compatible", env("UPLOAD_STORAGE").toLowerCase() === "s3", env("UPLOAD_STORAGE") || "missing");
  for (const name of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"]) {
    add(`${name} configured`, required(name), env(name) ? "configured" : "missing");
  }
  if (env("MINIO_ROOT_USER") || env("MINIO_ROOT_PASSWORD")) {
    add(
      "MinIO app credentials are not root credentials",
      env("S3_ACCESS_KEY") !== env("MINIO_ROOT_USER") && env("S3_SECRET_KEY") !== env("MINIO_ROOT_PASSWORD"),
      "app user must be separate from root user"
    );
  }
  add("EMAIL_PROVIDER smtp", env("EMAIL_PROVIDER") === "smtp", env("EMAIL_PROVIDER") || "missing");
  for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) {
    add(`${name} configured`, required(name), env(name) ? "configured" : "missing");
  }
  add("BILLING_PROVIDER Lemon Squeezy", env("BILLING_PROVIDER") === "LEMON_SQUEEZY", env("BILLING_PROVIDER") || "missing");
  for (const name of ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", "LEMONSQUEEZY_WEBHOOK_SECRET"]) {
    add(`${name} configured`, required(name), env(name) ? "configured" : "missing");
  }
  for (const name of [
    "LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID",
    "LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID",
    "LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID",
    "LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID"
  ]) {
    add(`${name} configured`, required(name), env(name) ? "configured" : "missing");
  }
  add("ADMIN_EMAIL configured", required("ADMIN_EMAIL"), env("ADMIN_EMAIL") || "missing");

  try {
    await prisma.$queryRaw`SELECT 1`;
    add("Database connection", true, "ok");
  } catch (error) {
    add("Database connection", false, error instanceof Error ? error.message : String(error));
  }

  const migration = await prismaMigrateStatus();
  add("Prisma migrations", migration.ok, migration.detail);

  try {
    const admins = await prisma.user.count({ where: { role: UserRole.ADMIN, firmId: null, isActive: true, passwordHash: { not: null } } });
    add("Active SaaS ADMIN exists", admins > 0, `${admins} active admin(s)`);
  } catch (error) {
    add("Active SaaS ADMIN exists", false, error instanceof Error ? error.message : String(error));
  }

  if (process.env.CHECK_HTTP_HEALTH === "1") {
    const health = await httpHealth();
    add("Public /api/health", health.ok, health.detail);
  }

  for (const item of checks) {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.name} - ${item.detail}`);
  }
  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`Production check failed: ${failed.map((item) => item.name).join(", ")}`);
    process.exitCode = 1;
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
