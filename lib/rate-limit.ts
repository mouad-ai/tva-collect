type Bucket = {
  count: number;
  resetAt: number;
};

const globalBuckets = globalThis as unknown as { tvaRateLimit?: Map<string, Bucket> };
const buckets = globalBuckets.tvaRateLimit ?? new Map<string, Bucket>();
globalBuckets.tvaRateLimit = buckets;

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}
