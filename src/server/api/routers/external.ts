import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import {
  externalTokenLimiter,
  getClientIpFromHeaders,
} from "~/lib/rate-limit";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const externalRouter = createTRPCRouter({
  /**
   * Verify Artisan Token
   * Used in partnership with the Artisanal Futures platform to verify artisan tokens.
   */
  verifyArtisanToken: publicProcedure
    .input(z.string().min(1).max(512))
    .query(async ({ ctx, input: aftoken }) => {
      // This is an unauthenticated public procedure that proxies to the partner
      // API, so throttle per IP to prevent brute-force / PII-harvesting abuse.
      try {
        await externalTokenLimiter.consume(getClientIpFromHeaders(ctx.headers));
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      let fetchToken: Response;
      try {
        fetchToken = await fetch(
          `${env.ARTISANAL_FUTURES_API_URL}/simplepress?code=${encodeURIComponent(aftoken)}`,
          {
            headers: {
              // Use a dedicated partner token when configured; fall back to the
              // internal hash secret only for backward compatibility. The
              // internal secret also signs Stripe OAuth state, so it should not
              // be shared with a third party once a distinct token is set.
              Authorization: `Bearer ${
                env.ARTISANAL_FUTURES_API_TOKEN ?? env.SIMPLEPRESS_HASH_SECRET
              }`,
            },
          },
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            service: "artisanal-futures",
            "trpc.procedure": "external.verifyArtisanToken",
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "External API unavailable",
        });
      }

      // Distinguish a partner-side outage/throttle from a genuinely bad token.
      // A 5xx/429 means the partner API is unavailable, not that the token is
      // invalid — surface that as UNAVAILABLE so the caller can retry rather than
      // telling the artisan their (possibly valid) token is wrong.
      if (fetchToken.status >= 500 || fetchToken.status === 429) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "External API unavailable. Please try again later.",
        });
      }

      if (fetchToken.status !== 200) {
        return { success: false as const, message: "Invalid artisan token" };
      }

      const data = (await fetchToken.json()) as {
        email: string;
        businessName: string;
      };

      return {
        email: data.email,
        businessName: data.businessName,
        success: true as const,
      };
    }),
});
