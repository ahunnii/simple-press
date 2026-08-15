import { NextResponse } from "next/server";

import { env } from "~/env";
import { getRedis } from "~/lib/redis";
import { s3Client } from "~/lib/s3/client";
import { STORAGE_BUCKET } from "~/lib/s3/url";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "fail";
type RedisCheckStatus = CheckStatus | "skipped";

interface HealthResult {
  ok: boolean;
  checks: {
    db: CheckStatus;
    redis: RedisCheckStatus;
    s3: CheckStatus;
  };
}

/** Per-dependency check timeout — a hung dependency fails fast instead of hanging the route. */
const CHECK_TIMEOUT_MS = 3000;

/** How long a computed result is reused before the checks are re-run. */
const CACHE_TTL_MS = 10_000;

let cached: { result: HealthResult; expiresAt: number } | null = null;
let inFlight: Promise<HealthResult> | null = null;

/** Rejects with a generic timeout error if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error("unknown error"));
      },
    );
  });
}

async function checkDb(): Promise<CheckStatus> {
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "fail";
  }
}

async function checkRedis(): Promise<RedisCheckStatus> {
  // Same "is Redis configured" check the shared client itself uses — see
  // `getRedis()` in ~/lib/redis. Unconfigured (dev without Redis) is not a
  // failure, so it's reported separately from a configured-but-unreachable
  // Redis.
  if (!env.REDIS_URL) return "skipped";

  try {
    const redis = await withTimeout(getRedis(), CHECK_TIMEOUT_MS);
    if (!redis) return "fail";
    const pong = await withTimeout(redis.ping(), CHECK_TIMEOUT_MS);
    return pong === "PONG" ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

async function checkS3(): Promise<CheckStatus> {
  try {
    // Cheapest available call against the existing minio client: a
    // ListObjectsV2 capped at one key, no prefix. Mirrors the raw-fetch
    // pattern already used in ~/lib/s3/list.ts — the client has no
    // dedicated HeadBucket helper.
    const url = `${s3Client.buildBucketUrl(STORAGE_BUCKET)}?list-type=2&max-keys=1`;
    const res = await withTimeout(
      s3Client.s3.fetch(url, { method: "GET" }),
      CHECK_TIMEOUT_MS,
    );
    return res.ok ? "ok" : "fail";
  } catch {
    return "fail";
  }
}

async function computeHealth(): Promise<HealthResult> {
  const [dbStatus, redisStatus, s3Status] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkS3(),
  ]);

  const ok =
    dbStatus === "ok" &&
    s3Status === "ok" &&
    (redisStatus === "ok" || redisStatus === "skipped");

  return { ok, checks: { db: dbStatus, redis: redisStatus, s3: s3Status } };
}

/**
 * Returns the cached health result if still fresh, otherwise recomputes it.
 * Concurrent callers during a cache miss share one in-flight computation
 * instead of each triggering their own round of dependency checks.
 */
async function getHealth(): Promise<HealthResult> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.result;
  if (inFlight) return inFlight;

  inFlight = computeHealth().finally(() => {
    inFlight = null;
  });

  const result = await inFlight;
  cached = { result, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}

/**
 * GET /api/health — unauthenticated liveness check for uptime monitors
 * (UptimeRobot, Coolify). Checks DB, Redis (only if configured), and S3,
 * each individually try/caught with a short timeout so one hung dependency
 * can't hang the route. Result is cached for CACHE_TTL_MS so this endpoint
 * can't be used to hammer the dependencies.
 *
 * Response body is intentionally minimal (booleans/status strings only) —
 * no error messages, hostnames, or config details, since this route is
 * public and unauthenticated. Failures are not sent to Sentry here — the
 * uptime monitor itself is the alerting channel for this signal.
 */
export async function GET() {
  const health = await getHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
