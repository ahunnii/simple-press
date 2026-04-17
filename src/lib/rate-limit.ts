import type { RateLimiterAbstract } from "rate-limiter-flexible";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";

type LimiterOpts = { points: number; duration: number; keyPrefix: string };

// Lazily initialize limiters on first use so that Redis connections are
// never attempted during Next.js static generation / build time.
function makeLazy(opts: LimiterOpts): { consume: (key: string) => Promise<void> } {
  let redisInstance: RateLimiterAbstract | null = null;
  let memoryInstance: RateLimiterAbstract | null = null;

  const getMemory = async (): Promise<RateLimiterAbstract> => {
    if (memoryInstance) return memoryInstance;
    const { RateLimiterMemory } = await import("rate-limiter-flexible");
    memoryInstance = new RateLimiterMemory(opts);
    return memoryInstance;
  };

  const getOrCreate = async (): Promise<RateLimiterAbstract> => {
    if (redisInstance) return redisInstance;

    if (env.REDIS_URL) {
      const { RateLimiterRedis } = await import("rate-limiter-flexible");
      const { default: Redis } = await import("ioredis");
      const client = new Redis(env.REDIS_URL, {
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      // Capture Redis errors in Sentry so outages are visible
      client.on("error", (err) => {
        Sentry.captureException(err, {
          tags: { service: "redis", component: "rate-limiter" },
        });
      });
      redisInstance = new RateLimiterRedis({ storeClient: client, ...opts });
      return redisInstance;
    }

    return getMemory();
  };

  return {
    consume: async (key: string) => {
      const limiter = await getOrCreate();
      try {
        await limiter.consume(key);
      } catch (err) {
        // RateLimiterRes = limit genuinely exceeded — always re-throw
        const { RateLimiterRes } = await import("rate-limiter-flexible");
        if (err instanceof RateLimiterRes) throw err;

        // Redis connection error — reset so next request retries, fall back to memory
        redisInstance = null;
        Sentry.captureException(err, {
          tags: { service: "redis", component: "rate-limiter-fallback" },
        });
        await (await getMemory()).consume(key);
      }
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

// 5 attempts per 15 minutes per IP — for testimonial invite submissions
export const testimonialSubmitLimiter = makeLazy({
  points: 5,
  duration: 900,
  keyPrefix: "rl:testimonial-submit",
});

// 10 attempts per minute per IP — for review votes
export const reviewVoteLimiter = makeLazy({
  points: 10,
  duration: 60,
  keyPrefix: "rl:review-vote",
});

// 5 contact form submissions per 10 minutes per IP
export const contactLimiter = makeLazy({
  points: 5,
  duration: 600,
  keyPrefix: "rl:contact",
});

// 10 checkout session attempts per minute per IP
export const checkoutLimiter = makeLazy({
  points: 10,
  duration: 60,
  keyPrefix: "rl:checkout",
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

/**
 * Same as getClientIp but accepts a Headers object directly.
 * Use this in tRPC procedures where ctx.headers is Headers, not Request.
 */
export function getClientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
