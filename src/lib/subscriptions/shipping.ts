import type { DbClient } from "~/server/db";
import { quoteShippingCents } from "~/lib/checkout/quote-shipping";

/**
 * Price the per-delivery shipping for a subscription signup, using the
 * store's normal shipping rules (`free` / `flat_rate` /
 * `flat_rate_with_threshold` / `zone_weight`) for the destination the shopper
 * entered on the `/subscribe` form.
 *
 * The result is **frozen** onto the `Subscription` row and billed as a
 * recurring line item for the life of the subscription. That is a deliberate
 * consequence of Stripe forbidding `shipping_options` in subscription mode:
 * there is no per-cycle re-quote, so the address is locked at signup and an
 * address change means cancel + resubscribe.
 *
 * A single line item, because the Subscribe flow is one product at a time —
 * but the weight that prices it is `quantity × product weight`, exactly as a
 * cart of the same size would be.
 */
export interface QuoteSubscriptionShippingInput {
  businessId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  destinationState: string;
  destinationCountry: string;
  deliveryMethod: "ship" | "pickup";
}

export async function quoteSubscriptionShipping(
  db: DbClient,
  input: QuoteSubscriptionShippingInput,
): Promise<number> {
  return quoteShippingCents(db, {
    businessId: input.businessId,
    items: [
      {
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity,
      },
    ],
    destinationState: input.destinationState,
    destinationCountry: input.destinationCountry,
    deliveryMethod: input.deliveryMethod,
    source: "stripe.subscriptions.create-session",
  });
}
