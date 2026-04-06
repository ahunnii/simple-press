import type { RateLimiterAbstract } from "rate-limiter-flexible";

import { env } from "~/env";

type LimiterOpts = { points: number; duration: number; keyPrefix: string };

// Lazily initialize limiters on first use so that Redis connections are
// never attempted during Next.js static generation / build time.
function makeLazy(opts: LimiterOpts): { consume: (key: string) => Promise<void> } {
  let instance: RateLimiterAbstract | null = null;

  const getOrCreate = async (): Promise<RateLimiterAbstract> => {
    if (instance) return instance;

    const { RateLimiterMemory, RateLimiterRedis } = await import(
      "rate-limiter-flexible"
    );

    if (env.REDIS_URL) {
      const { default: Redis } = await import("ioredis");
      const client = new Redis(env.REDIS_URL, {
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      // Suppress unhandled error events — rate limiter handles them internally
      client.on("error", () => undefined);
      instance = new RateLimiterRedis({ storeClient: client, ...opts });
    } else {
      instance = new RateLimiterMemory(opts);
    }

    return instance;
  };

  return {
    consume: async (key: string) => {
      const limiter = await getOrCreate();
      await limiter.consume(key);
    },
  };
}

// 5 attempts per 15 minutes per IP — for auth + onboarding
export const authLimiter = makeLazy({
  points: 5,
  duration: 900,
  keyPrefix: "rl:auth",
});

// 10 attempts per minute per IP — for discount code validation
export const discountLimiter = makeLazy({
  points: 10,
  duration: 60,
  keyPrefix: "rl:discount",
});

// 20 attempts per minute per IP — for subdomain availability checks
export const subdomainLimiter = makeLazy({
  points: 20,
  duration: 60,
  keyPrefix: "rl:subdomain",
});

// 5 attempts per 15 minutes per IP — for invitation code checks
export const inviteLimiter = makeLazy({
  points: 5,
  duration: 900,
  keyPrefix: "rl:invite",
});

/**
 * Extracts a best-effort client IP from Next.js request headers.
 * Falls back to a generic key so rate limiting always applies.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
