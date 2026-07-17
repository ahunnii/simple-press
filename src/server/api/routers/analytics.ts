/**
 * Analytics tRPC router.
 *
 * Security rules (non-negotiable):
 * - All procedures are ownerAdminProcedure (auth + membership enforced by middleware).
 * - The Umami websiteId is ALWAYS derived server-side from ctx.businessId. It is
 *   never accepted as client input. The only user-supplied input is `range`.
 * - The bearer token is never returned in any procedure response.
 */

import { z } from "zod";

import {
  getActive,
  getMetrics,
  getPageviewsSeries,
  getStats,
} from "~/lib/umami/client";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
} from "~/server/api/trpc";

const rangeSchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

/** Resolve a range string to epoch-ms startAt/endAt. */
function resolveRange(range: "7d" | "30d" | "90d"): {
  startAt: number;
  endAt: number;
} {
  const endAt = Date.now();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const startAt = endAt - days * 24 * 60 * 60 * 1000;
  return { startAt, endAt };
}

/** Sentinel returned when analytics is not configured for this business. */
const NOT_CONFIGURED = { configured: false as const };

export const analyticsRouter = createTRPCRouter({
  /**
   * overview — aggregate stats + active visitor count + daily pageviews series.
   */
  overview: ownerAdminProcedure
    .use(featureGate("analytics"))
    .input(rangeSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { umamiWebsiteId: true, umamiEnabled: true },
      });

      if (!business?.umamiEnabled || !business.umamiWebsiteId) {
        return NOT_CONFIGURED;
      }

      const { startAt, endAt } = resolveRange(input.range);
      const websiteId = business.umamiWebsiteId;

      const [stats, active, pageviewsSeries] = await Promise.all([
        getStats({ websiteId, startAt, endAt }),
        getActive({ websiteId }),
        getPageviewsSeries({
          websiteId,
          startAt,
          endAt,
          unit: "day",
          timezone: "UTC",
        }),
      ]);

      return {
        configured: true as const,
        stats,
        active,
        pageviewsSeries,
      };
    }),

  /**
   * topPages — top URLs by pageview count.
   */
  topPages: ownerAdminProcedure
    .use(featureGate("analytics"))
    .input(rangeSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { umamiWebsiteId: true, umamiEnabled: true },
      });

      if (!business?.umamiEnabled || !business.umamiWebsiteId) {
        return NOT_CONFIGURED;
      }

      const { startAt, endAt } = resolveRange(input.range);
      const websiteId = business.umamiWebsiteId;

      // Umami's metrics API expects the page-path column as "path" (not "url");
      // passing "url" returns 400 bad-request on current Umami versions.
      const rows = await getMetrics({
        websiteId,
        startAt,
        endAt,
        type: "path",
        limit: 10,
      });

      return { configured: true as const, rows };
    }),

  /**
   * topReferrers — top referrer domains.
   */
  topReferrers: ownerAdminProcedure
    .use(featureGate("analytics"))
    .input(rangeSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { umamiWebsiteId: true, umamiEnabled: true },
      });

      if (!business?.umamiEnabled || !business.umamiWebsiteId) {
        return NOT_CONFIGURED;
      }

      const { startAt, endAt } = resolveRange(input.range);
      const websiteId = business.umamiWebsiteId;

      const rows = await getMetrics({
        websiteId,
        startAt,
        endAt,
        type: "referrer",
        limit: 10,
      });

      return { configured: true as const, rows };
    }),

  /**
   * events — custom commerce event counts (add-to-cart, begin-checkout, product-view).
   *
   * Uses getMetrics with type="event" to get per-event-name counts.
   * websiteId is always derived server-side from ctx.businessId (IDOR guardrail).
   */
  events: ownerAdminProcedure
    .use(featureGate("analytics"))
    .input(rangeSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { umamiWebsiteId: true, umamiEnabled: true },
      });

      if (!business?.umamiEnabled || !business.umamiWebsiteId) {
        return NOT_CONFIGURED;
      }

      const { startAt, endAt } = resolveRange(input.range);
      const websiteId = business.umamiWebsiteId;

      // Fetch all custom event counts for the range
      const rows = await getMetrics({
        websiteId,
        startAt,
        endAt,
        type: "event",
        limit: 50,
      });

      // Extract counts for the three known commerce events (default to 0)
      const find = (name: string) => rows.find((r) => r.x === name)?.y ?? 0;

      return {
        configured: true as const,
        rows,
        commerce: {
          addToCart: find(ANALYTICS_EVENTS.ADD_TO_CART),
          beginCheckout: find(ANALYTICS_EVENTS.BEGIN_CHECKOUT),
          productView: find(ANALYTICS_EVENTS.PRODUCT_VIEW),
          purchase: find(ANALYTICS_EVENTS.PURCHASE),
        },
      };
    }),

  /**
   * embedEngagement — iframe click-through and approximate dwell counts.
   *
   * Uses getMetrics with type="event" (same as `events` procedure) and
   * extracts counts for the two embed tracking events:
   *
   * - engagements: number of times visitors clicked INTO an embed frame
   *   (reliable — fired on window blur when iframe is activeElement).
   * - dwellSessions: number of times the approximate dwell timer completed
   *   (fired on window focus after an engagement, capped at 1800 s).
   *
   * NOTE: A true average dwell is not available here because getMetrics
   * returns per-event-name aggregate counts, not individual event payloads.
   * The Umami API's /events/series endpoint returns time-bucketed counts,
   * not raw per-event numeric payloads either. Computing the average would
   * require a custom Umami query or storing aggregates server-side, which
   * is outside the scope of Phase 3. The dashboard displays these counts
   * and labels them accordingly.
   *
   * Security: websiteId is always derived from ctx.businessId (IDOR guard).
   */
  embedEngagement: ownerAdminProcedure
    .use(featureGate("analytics"))
    .input(rangeSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        select: { umamiWebsiteId: true, umamiEnabled: true },
      });

      if (!business?.umamiEnabled || !business.umamiWebsiteId) {
        return NOT_CONFIGURED;
      }

      const { startAt, endAt } = resolveRange(input.range);
      const websiteId = business.umamiWebsiteId;

      const rows = await getMetrics({
        websiteId,
        startAt,
        endAt,
        type: "event",
        limit: 50,
      });

      const find = (name: string) => rows.find((r) => r.x === name)?.y ?? 0;

      return {
        configured: true as const,
        /**
         * Number of times a visitor clicked into an embed iframe.
         * Reliable — triggered by window blur + activeElement check.
         */
        engagements: find(ANALYTICS_EVENTS.EMBED_ENGAGED),
        /**
         * Number of completed dwell sessions (visitor clicked back out).
         * Approximate — window blur also fires on browser tab switches,
         * so this may over-count. Values > 1800s are discarded client-side.
         */
        dwellSessions: find(ANALYTICS_EVENTS.EMBED_ENGAGED_TIME),
      };
    }),
});
