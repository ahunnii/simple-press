import "server-only";

import type Redis from "ioredis";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";

/**
 * Shared Redis client for rate limiting and Better Auth secondary storage.
 *
 * Lazily created so `pnpm build` / static generation never opens a connection.
 * Returns `null` when `REDIS_URL` is unset (local/dev without Redis).
 */
let client: Redis | null = null;
let connecting: Promise<Redis | null> | null = null;

export async function getRedis(): Promise<Redis | null> {
  if (client) return client;
  if (!env.REDIS_URL) return null;
  if (connecting) return connecting;

  connecting = (async () => {
    const { default: RedisCtor } = await import("ioredis");
    const redis = new RedisCtor(env.REDIS_URL!, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    redis.on("error", (err) => {
      Sentry.captureException(err, {
        tags: { service: "redis", component: "shared-client" },
      });
    });
    try {
      await redis.connect();
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: "redis", component: "shared-client-connect" },
      });
      connecting = null;
      return null;
    }
    client = redis;
    return client;
  })();

  return connecting;
}

/**
 * Better Auth `secondaryStorage` adapter backed by the shared Redis client.
 * Used for distributed auth rate limiting across Coolify replicas.
 */
export function createRedisSecondaryStorage() {
  return {
    get: async (key: string) => {
      const redis = await getRedis();
      if (!redis) return null;
      return redis.get(key);
    },
    set: async (key: string, value: string, ttlSeconds?: number) => {
      const redis = await getRedis();
      if (!redis) return;
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, "EX", ttlSeconds);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key: string) => {
      const redis = await getRedis();
      if (!redis) return;
      await redis.del(key);
    },
  };
}
