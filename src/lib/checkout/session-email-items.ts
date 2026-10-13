import type { AbandonedCheckoutItem } from "~/emails/abandoned-checkout";
import { OPTIONS_SUMMARY_METADATA_KEY } from "~/lib/checkout/customizer-checkout";
import { stripeClient } from "~/lib/stripe/client";

/**
 * The line items of a cart Checkout Session, shaped for the shopper/owner
 * emails that describe a checkout without an Order behind it (abandoned cart,
 * bank payment still processing, bank payment failed).
 *
 * Webhook session payloads do not include `line_items` (they need expansion),
 * so the items are listed on the connected account that owns the session.
 * Throws whatever Stripe throws — every caller treats the list as optional,
 * catches, reports under its own `webhook.step` tag and sends the email
 * without items.
 */
export async function listCheckoutSessionEmailItems(params: {
  sessionId: string;
  stripeAccount: string;
  /** The store logo, so a logo-as-thumbnail fallback can be dropped. */
  logoUrl?: string | null;
}): Promise<AbandonedCheckoutItem[]> {
  const lineItems = await stripeClient.checkout.sessions.listLineItems(
    params.sessionId,
    { limit: 100, expand: ["data.price.product"] },
    { stripeAccount: params.stripeAccount },
  );
  return lineItems.data.map((line) => {
    const product =
      line.price?.product &&
      typeof line.price.product !== "string" &&
      !("deleted" in line.price.product)
        ? line.price.product
        : undefined;
    const quantity = line.quantity ?? 1;
    // create-session falls back to the business logo when a product has no
    // image — not a useful thumbnail, so drop it.
    const image = product?.images[0];
    const variantName = product?.metadata.variantName;
    // Product customizer: the build's one-line summary (create-session
    // writes it on configured lines only).
    const optionsSummary =
      product?.metadata[OPTIONS_SUMMARY_METADATA_KEY]?.trim();
    return {
      name: product?.name ?? line.description ?? "Item",
      variantName: variantName?.length ? variantName : undefined,
      ...(optionsSummary ? { optionsSummary } : {}),
      quantity,
      unitAmount:
        line.price?.unit_amount ??
        (quantity
          ? Math.round(line.amount_subtotal / quantity)
          : line.amount_subtotal),
      imageUrl: image && image !== params.logoUrl ? image : undefined,
    };
  });
}
