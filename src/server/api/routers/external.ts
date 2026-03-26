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
      const fetchToken = await fetch(
        `${env.ARTISANAL_FUTURES_API_URL}/simplepress?code=${encodeURIComponent(aftoken)}`,
        {
          headers: {
            Authorization: `Bearer ${env.SIMPLEPRESS_HASH_SECRET}`,
          },
        },
      );

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

  updateArtisanToken: publicProcedure
    .input(
      z.object({
        aftoken: z.string(),
        businessId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { aftoken, businessId } }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { subdomain: true, customDomain: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updateToken = await fetch(
        `${env.ARTISANAL_FUTURES_API_URL}/simplepress`,
        {
          method: "POST",
          body: JSON.stringify({
            artisanToken: aftoken,
            subdomain: business.subdomain,
            customDomain:
              business.customDomain ??
              `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.SIMPLEPRESS_HASH_SECRET}`,
          },
        },
      );

      const updateTokenResponse = (await updateToken.json()) as {
        ok: boolean;
      };
      if (!updateTokenResponse.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to update artisan token",
        });
      }

      return { success: true };
    }),
});
