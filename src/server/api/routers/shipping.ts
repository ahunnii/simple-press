import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { LocalDeliveryIneligibleReason } from "~/lib/local-delivery";
import { checkBusiness } from "~/lib/check-business";
import {
  computeCartSubtotalCents,
  quoteShippingCents,
  ShippingQuoteBusinessNotFoundError,
} from "~/lib/checkout/quote-shipping";
import { checkLocalDelivery } from "~/lib/local-delivery";
import {
  getClientIpFromHeaders,
  localDeliveryCheckLimiter,
} from "~/lib/rate-limit";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const cartItemsInput = z
  .array(
    z.object({
      productId: z.string().min(1).max(255),
      variantId: z.string().max(255).nullable(),
      quantity: z.number().int().positive().max(10000),
    }),
  )
  .min(1)
  .max(200);

export const shippingRouter = createTRPCRouter({
  /**
   * Quote shipping cost for a set of cart items to a destination.
   * Re-fetches product weights and prices server-side — never trusts the client.
   * Used by the checkout form to preview shipping before the Stripe session is created.
   *
   * The calculation itself lives in `~/lib/checkout/quote-shipping` so the
   * subscription checkout route can price a delivery with the store's real
   * rules instead of a second, drifting copy. This procedure is a thin
   * wrapper: resolve the tenant, delegate, map the one error case back to the
   * `NOT_FOUND` it has always returned.
   */
  quote: publicProcedure
    .input(
      z.object({
        items: cartItemsInput,
        destinationState: z.string(),
        destinationCountry: z.string(),
        deliveryMethod: z.enum(["ship", "pickup"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { items, destinationState, destinationCountry, deliveryMethod } =
        input;

      // Resolve business from the current domain (same pattern as customer router).
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      try {
        const shippingCents = await quoteShippingCents(ctx.db, {
          businessId: business.id,
          items,
          destinationState,
          destinationCountry,
          deliveryMethod,
          // The high-volume call site: this is the live quote, debounced but
          // still re-running every time the shopper changes state, country,
          // delivery method or cart — on a public, unauthenticated procedure.
          // It reports anyway, because a store whose matrix quotes $99.99 loses
          // the shopper HERE, at the price preview, and the checkout call site
          // never gets to run — suppressing this would leave the worst case
          // invisible.
          source: "shipping.quote",
        });
        return { shippingCents };
      } catch (error) {
        if (error instanceof ShippingQuoteBusinessNotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business not found",
          });
        }
        throw error;
      }
    }),
  /**
   * Can this cart be locally delivered to this ZIP? Powers the checkout's
   * "Local delivery" option preview; `create-session` re-runs the same
   * `checkLocalDelivery` against the real (customizer-priced) subtotal before
   * any money moves, so this is advisory.
   *
   * Never returns a distance (or anything finer than the coarse reason) — a
   * visitor probing ZIPs must not be able to triangulate the owner's origin.
   *
   * Throttled FIRST, ahead of any database read, like `quoteCalculator.lookupZip`:
   * it is public, anonymous and fires on ZIP / cart edits.
   */
  checkLocalDelivery: publicProcedure
    .use(async ({ ctx, next }) => {
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      try {
        await localDeliveryCheckLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many delivery checks. Please try again later.",
        });
      }
      return next();
    })
    .input(
      z.object({
        items: cartItemsInput,
        postalCode: z.string().max(20),
        country: z.string().max(2),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        eligible: boolean;
        reason?: LocalDeliveryIneligibleReason;
        feeCents?: number;
        minOrderCents?: number;
      }> => {
        const tenant = await checkBusiness();
        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business not found",
          });
        }

        const settings = await ctx.db.business.findUnique({
          where: { id: tenant.id },
          select: {
            offersLocalDelivery: true,
            localDeliveryOriginZip: true,
            addressPostalCode: true,
            localDeliveryRadiusMiles: true,
            localDeliveryFeeCents: true,
            localDeliveryBands: true,
            localDeliveryMinOrderCents: true,
          },
        });
        if (!settings) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business not found",
          });
        }

        // Skip the product reads when the answer can't depend on the cart.
        const subtotalCents = settings.offersLocalDelivery
          ? await computeCartSubtotalCents(ctx.db, tenant.id, input.items)
          : 0;

        const result = await checkLocalDelivery({
          settings,
          destinationZip: input.postalCode,
          destinationCountry: input.country,
          subtotalCents,
        });

        return result.eligible
          ? { eligible: true, feeCents: result.feeCents }
          : {
              eligible: false,
              reason: result.reason,
              ...(result.minOrderCents != null
                ? { minOrderCents: result.minOrderCents }
                : {}),
              // below_minimum only: this address's (band) price once the
              // minimum is met — see LocalDeliveryResult.
              ...(result.feeCents != null ? { feeCents: result.feeCents } : {}),
            };
      },
    ),
});
