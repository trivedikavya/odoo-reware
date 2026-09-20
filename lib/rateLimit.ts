/**
 * Simple in-process rate limiting. State is kept in memory (module-level
 * Maps) which is sufficient for a single-process demo deployment. If this
 * app scales to multiple instances, swap this for a shared store (e.g.
 * Upstash Redis) behind the same function signatures.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function getBucket(key: string): Bucket {
  let b = buckets.get(key);
  if (!b) {
    b = { timestamps: [] };
    buckets.set(key, b);
  }
  return b;
}

/**
 * Returns true if the action is allowed (and records it), false if the
 * caller has exceeded `max` attempts within `windowMs`.
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = getBucket(key);
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - oldest),
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: max - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

/** Login rate limit: max 5 attempts per 15 min, keyed by ip+email. */
export function checkLoginRateLimit(ip: string, email: string) {
  return checkRateLimit(`login:${ip}:${email}`, 5, 15 * 60 * 1000);
}

/** Swap request rate limit: max 10 new requests per user per 24h. */
export function checkSwapRateLimit(userId: string) {
  return checkRateLimit(`swap:${userId}`, 10, 24 * 60 * 60 * 1000);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
