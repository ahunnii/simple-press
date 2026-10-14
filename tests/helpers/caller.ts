import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

import { db } from "./db";

type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Build a tRPC server-side caller with a synthetic session, for integration
 * tests. Tenant resolution inside procedures reads the request host via
 * `next/headers` — mock that module in the test to control which business
 * resolves (see tenant-isolation.test.ts).
 */
export function createTestCaller(opts: {
  userId?: string;
  email?: string;
  platformRole?: "BUSINESS_USER" | "PLATFORM_ADMIN";
  /** Request headers on the context (e.g. a `cookie` header). */
  headers?: HeadersInit;
}) {
  const session =
    opts.userId == null
      ? null
      : {
          session: { id: "test-session", userId: opts.userId },
          user: {
            id: opts.userId,
            email: opts.email ?? "owner@test.dev",
            platformRole: opts.platformRole ?? "BUSINESS_USER",
          },
        };

  const ctx = {
    db,
    session,
    headers: new Headers(opts.headers),
  } as unknown as Ctx;

  return createCaller(ctx);
}
