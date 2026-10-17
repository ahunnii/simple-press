import { TRPCError } from "@trpc/server";
import { RateLimiterRes } from "rate-limiter-flexible";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getClientIpFromHeaders, siteSearchLimiter } from "~/lib/rate-limit";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { searchSite } from "~/server/search/site-search";
import { SITE_SEARCH_TYPES } from "~/server/search/site-search-types";

/**
 * Public storefront site search (flag `siteSearch`). Separate from the staff
 * `search` router (admin ⌘K). The header dialog calls this with
 * `limitPerGroup: 3`; the `/search` page calls `searchSite()` directly.
 */
export const storefrontSearchRouter = createTRPCRouter({
  query: publicProcedure
    .input(
      z.object({
        q: z.string().max(200),
        type: z.enum(SITE_SEARCH_TYPES).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const settings = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: { featureFlags: true, businessType: true },
      });
      const { isEnabled } = resolveFlags(settings?.featureFlags);
      if (!isEnabled("siteSearch")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      }

      // Fail OPEN on limiter infrastructure errors (Redis down, import
      // failure): search is a read of already-public data, so an outage must
      // not break it. Only a genuine `RateLimiterRes` rejection is a 429.
      try {
        await siteSearchLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
        );
      } catch (err) {
        if (err instanceof RateLimiterRes) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many searches. Please wait a moment and try again.",
          });
        }
      }

      return searchSite({
        businessId: business.id,
        q: input.q,
        isEnabled,
        businessType: settings?.businessType ?? null,
        limitPerGroup: 3,
        type: input.type,
        timeZone: business.timeZone,
        db: ctx.db,
      });
    }),
});
