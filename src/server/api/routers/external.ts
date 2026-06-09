import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
export const externalRouter = createTRPCRouter({
  /**
   * Verify Artisan Token
   * Used in partnership with the Artisanal Futures platform to verify artisan tokens.
   */
  verifyArtisanToken: publicProcedure
    .input(z.string().min(1))
    .query(async ({ input: aftoken }) => {
      let fetchToken: Response;
      try {
        fetchToken = await fetch(
          `${env.ARTISANAL_FUTURES_API_URL}/simplepress?code=${encodeURIComponent(aftoken)}`,
          {
            headers: {
              Authorization: `Bearer ${env.SIMPLEPRESS_HASH_SECRET}`,
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
