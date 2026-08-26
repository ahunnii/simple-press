import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  quoteShippingCents,
  ShippingQuoteBusinessNotFoundError,
} from "~/lib/checkout/quote-shipping";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
        items: z
          .array(
            z.object({
              productId: z.string().min(1).max(255),
              variantId: z.string().max(255).nullable(),
              quantity: z.number().int().positive().max(10000),
            }),
          )
          .min(1)
          .max(200),
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
});
