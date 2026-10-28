/**
 * The "What to expect" aside's third line used to ship as a fixed claim
 * ("Local pickup and shipping are both available.") that was false for any
 * store without pickup. That text is still the field's default, now acting as
 * a marker: while the line still equals it, the page shows a sentence built
 * from the store's Shipping settings instead. Any other text the owner types
 * is shown verbatim, and a blank line stays hidden.
 */
export const UMSC_FULFILLMENT_LINE_DEFAULT =
  "Local pickup and shipping are both available.";

type FulfillmentSettings = {
  offersInStorePickup?: boolean | null;
  offersLocalDelivery?: boolean | null;
};

/** Sentence describing how orders reach the customer, from Settings. */
export function resolveUmscFulfillmentLine(
  value: string,
  settings: FulfillmentSettings,
): string {
  if (value.trim() !== UMSC_FULFILLMENT_LINE_DEFAULT) return value;
  const pickup = settings.offersInStorePickup === true;
  const delivery = settings.offersLocalDelivery === true;
  if (pickup && delivery) {
    return "Local pickup, local delivery and shipping are available.";
  }
  if (pickup) return "Local pickup and shipping are available.";
  if (delivery) return "Local delivery and shipping are available.";
  return "We ship your order right to your door.";
}
