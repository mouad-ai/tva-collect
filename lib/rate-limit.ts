import { ErrorSeverity } from "@prisma/client";
import { logServerError } from "@/lib/error-logging";
import { prisma } from "@/lib/prisma";

function isMissingRateLimitTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021" &&
    "meta" in error &&
    typeof error.meta === "object" &&
    error.meta !== null &&
    "table" in error.meta &&
    String(error.meta.table).includes("RateLimitBucket")
  );
}

export async function rateLimit({
  key,
  limit,
  windowMs
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const bucket = await prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!existing || existing.resetAt <= now) {
      return tx.rateLimitBucket.upsert({
        where: { key },
        update: { attempts: 1, resetAt },
        create: { key, attempts: 1, resetAt }
      });
    }
    if (existing.attempts >= limit) return existing;
    return tx.rateLimitBucket.update({
      where: { key },
      data: { attempts: { increment: 1 } }
    });
  }).catch(async (error) => {
    if (isMissingRateLimitTable(error)) {
      // Fail-open by design (blocking every request platform-wide because a
      // rate-limit table is missing would be worse than the missing limit
      // itself), but this means rate limiting is silently OFF — that's a
      // security-relevant infra problem, not a warning to lose in stdout.
      console.warn("RateLimitBucket table is missing; allowing request without persistent rate limit.");
      await logServerError({
        error: new Error(`RateLimitBucket table missing — rate limiting is disabled for key "${key}".`),
        severity: ErrorSeverity.CRITICAL,
        metadata: { key }
      });
      return { attempts: 1, resetAt };
    }
    throw error;
  });

  return {
    allowed: bucket.attempts <= limit,
    remaining: Math.max(0, limit - bucket.attempts),
    resetAt: bucket.resetAt.getTime()
  };
}

export function rateLimitIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
