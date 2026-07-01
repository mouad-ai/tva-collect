import { prisma } from "@/lib/prisma";

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
