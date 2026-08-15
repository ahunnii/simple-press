import type { RateLimiterAbstract } from "rate-limiter-flexible";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { getRedis } from "~/lib/redis";

type LimiterOpts = { points: number; duration: number; keyPrefix: string };

// Lazily initialize limiters on first use so that Redis connections are
// never attempted during Next.js static generation / build time.
function makeLazy(opts: LimiterOpts): {
  consume: (key: string) => Promise<void>;
} {
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

    const client = await getRedis();
    if (client) {
      const { RateLimiterRedis } = await import("rate-limiter-flexible");
      redisInstance = new RateLimiterRedis({ storeClient: client, ...opts });
      return redisInstance;
    }

    if (env.NODE_ENV === "production") {
      // Production without Redis means per-process limits — alert once via
      // the shared client's connect path; still fall back so the app serves.
      Sentry.captureMessage("Rate limiter falling back to memory in production", {
        level: "warning",
        tags: { service: "redis", component: "rate-limiter" },
      });
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

// 5 attempts per 15 minutes per IP — for guest order-status link requests
export const orderLookupLimiter = makeLazy({
  points: 5,
  duration: 900,
  keyPrefix: "rl:order-lookup",
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

// 5 quote calculator submissions per 15 minutes per IP, keyed ip:host
export const quoteSubmitLimiter = makeLazy({
  points: 5,
  duration: 900,
  keyPrefix: "rl:quote-submit",
});

// 30 public zip→city/state lookups per minute per IP (keystroke-adjacent), keyed ip:host
export const quoteZipLookupLimiter = makeLazy({
  points: 30,
  duration: 60,
  keyPrefix: "rl:quote-zip",
});

// 10 checkout session attempts per minute per IP
export const checkoutLimiter = makeLazy({
  points: 10,
  duration: 60,
  keyPrefix: "rl:checkout",
});

// 10 attempts per 15 minutes per IP — for back-in-stock notification signups
export const backInStockLimiter = makeLazy({
  points: 10,
  duration: 900,
  keyPrefix: "rl:back-in-stock",
});

// 30 requests per minute per IP — for the machine-to-machine partner
// provisioning API (Artisanal Futures → SimplePress). Higher than the
// human-facing limiters since a partner may legitimately provision in bursts.
export const partnerApiLimiter = makeLazy({
  points: 30,
  duration: 60,
  keyPrefix: "rl:partner-api",
});

// 10 attempts per minute per IP — for unauthenticated external token lookups
// (Artisanal Futures). Prevents the public procedure being abused as an
// unthrottled brute-force / harvesting oracle against the partner API.
export const externalTokenLimiter = makeLazy({
  points: 10,
  duration: 60,
  keyPrefix: "rl:external-token",
});

/**
 * Extract a best-effort client IP from request headers.
 *
 * When `TRUSTED_PROXY_IPS` is configured, take the rightmost address that is
 * not in the trusted-proxy set (the first untrusted hop from the right). That
 * is the real client when Traefik/Coolify appends rather than replaces
 * `X-Forwarded-For`. Without trusted proxies configured, keep the historical
 * leftmost behaviour and document that Coolify must be verified — see
 * `docs/followup/trusted-proxy-ip-spoofing.md`.
 */
function resolveClientIp(headers: Headers): string {
  const trusted = (env.TRUSTED_PROXY_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const xff = headers.get("x-forwarded-for");
  const xffParts = xff
    ? xff
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  if (trusted.length > 0 && xffParts.length > 0) {
    for (let i = xffParts.length - 1; i >= 0; i--) {
      const candidate = xffParts[i]!;
      if (!trusted.includes(candidate)) {
        return candidate;
      }
    }
    // Entire chain was trusted proxies — no client IP visible.
    return "unknown";
  }

  return (
    xffParts[0] ??
    headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

/**
 * Extracts a best-effort client IP from Next.js request headers.
 * Falls back to a generic key so rate limiting always applies.
 */
export function getClientIp(req: Request): string {
  return resolveClientIp(req.headers);
}

/**
 * Same as getClientIp but accepts a Headers object directly.
 * Use this in tRPC procedures where ctx.headers is Headers, not Request.
 */
export function getClientIpFromHeaders(headers: Headers): string {
  return resolveClientIp(headers);
}
