import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Fallback en memoria cuando no hay Redis configurado
const memStore = new Map<string, { count: number; resetAt: number }>();

function memRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}

// Cache de instancias Ratelimit para no re-crear por cada request
const limiters = new Map<string, Ratelimit>();

function getLimiter(max: number, windowMs: number): Ratelimit {
  const cacheKey = `${max}:${windowMs}`;
  if (!limiters.has(cacheKey)) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
        prefix: "rl",
      }),
    );
  }
  return limiters.get(cacheKey)!;
}

export async function isRateLimited(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return memRateLimit(key, max, windowMs);
  }

  try {
    const { success } = await getLimiter(max, windowMs).limit(key);
    return !success;
  } catch {
    // Si Redis falla, caemos al store en memoria para no bloquear la app
    return memRateLimit(key, max, windowMs);
  }
}
