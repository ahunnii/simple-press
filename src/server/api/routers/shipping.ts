import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { buildZoneWeightConfig } from "~/lib/shipping-config";
import {
  calculateShipping,
  calculateZoneWeightShipping,
  normalizeWeightToLb,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const shippingRouter = createTRPCRouter({
  /**
   * Quote shipping cost for a set of cart items to a destination.
   * Re-fetches product weights and prices server-side — never trusts the client.
   * Used by the checkout form to preview shipping before the Stripe session is created.
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

      // Pickup is always free.
      if (deliveryMethod === "pickup") {
        return { shippingCents: 0 };
      }

      // Fetch the full business row so we have shipping fields.
      const businessData = await ctx.db.business.findUnique({
        where: { id: business.id },
        select: {
          shippingType: true,
          shippingFlatRate: true,
          freeShippingThreshold: true,
          offersInStorePickup: true,
          shippingWeightTiers: true,
          shippingFallbackRate: true,
          shippingDefaultItemWeightLb: true,
        },
      });

      if (!businessData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Collect product and variant ids.
      const variantIds = [
        ...new Set(
          items
            .map((i) => i.variantId)
            .filter((id): id is string => id !== null),
        ),
      ];
      const productIds = [...new Set(items.map((i) => i.productId))];

      // Fetch product and variant data server-side (price + weight).
      const [variantsWithProduct, products] = await Promise.all([
        variantIds.length > 0
          ? ctx.db.productVariant.findMany({
              where: {
                id: { in: variantIds },
                product: { businessId: business.id, published: true },
              },
              select: {
                id: true,
                price: true,
                product: {
                  select: {
                    price: true,
                    weight: true,
                    weightUnit: true,
                  },
                },
              },
            })
          : [],
        ctx.db.product.findMany({
          where: {
            id: { in: productIds },
            businessId: business.id,
            // Drafts are not purchasable (checkout rejects them in
            // `validate-cart`), so they must not contribute a price or weight
            // to a quote either.
            published: true,
          },
          select: {
            id: true,
            price: true,
            weight: true,
            weightUnit: true,
          },
        }),
      ]);

      const variantMap = new Map(variantsWithProduct.map((v) => [v.id, v]));
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Compute subtotal (server prices only).
      let subtotalCents = 0;
      for (const item of items) {
        const price = item.variantId
          ? (variantMap.get(item.variantId)?.price ??
            productMap.get(item.productId)?.price ??
            0)
          : (productMap.get(item.productId)?.price ?? 0);
        subtotalCents += price * item.quantity;
      }

      // Compute total weight in pounds.
      const defaultItemWeightLb = businessData.shippingDefaultItemWeightLb ?? 0;
      let totalWeightLb = 0;
      for (const item of items) {
        let weightLb: number;
        if (item.variantId) {
          const variant = variantMap.get(item.variantId);
          const pw = variant?.product.weight ?? null;
          const pu = variant?.product.weightUnit ?? null;
          weightLb =
            pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
        } else {
          const product = productMap.get(item.productId);
          const pw = product?.weight ?? null;
          const pu = product?.weightUnit ?? null;
          weightLb =
            pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
        }
        totalWeightLb += weightLb * item.quantity;
      }

      // Compute shipping cost.
      let shippingCents: number;

      if (businessData.shippingType === SHIPPING_TYPES.ZONE_WEIGHT) {
        // Load zones with rates for zone+weight calculation.
        const zones = await ctx.db.shippingZone.findMany({
          where: { businessId: business.id },
          include: { rates: true },
          orderBy: { sortOrder: "asc" },
        });

        const config = buildZoneWeightConfig({
          shippingWeightTiers: businessData.shippingWeightTiers,
          shippingFallbackRate: businessData.shippingFallbackRate,
          freeShippingThreshold: businessData.freeShippingThreshold,
          shippingDefaultItemWeightLb: businessData.shippingDefaultItemWeightLb,
          zones,
        });

        shippingCents = calculateZoneWeightShipping({
          destinationState,
          destinationCountry,
          totalWeightLb,
          subtotalCents,
          config,
        });
      } else {
        const shippingConfig = shippingConfigFromBusiness({
          shippingType: businessData.shippingType,
          shippingFlatRate: businessData.shippingFlatRate,
          freeShippingThreshold: businessData.freeShippingThreshold,
          offersInStorePickup: businessData.offersInStorePickup,
        });
        shippingCents = calculateShipping(subtotalCents, shippingConfig);
      }

      return { shippingCents };
    }),
});
