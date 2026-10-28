/**
 * How an order reaches the customer. Stored verbatim in
 * `Order.deliveryMethod` (a plain String column — see prisma/schema.prisma).
 *
 * - `ship`     — carrier shipping to the customer's address.
 * - `pickup`   — customer collects it (`Business.offersInStorePickup`).
 * - `delivery` — the owner drives it to an address within their local
 *   delivery radius (`Business.offersLocalDelivery`; eligibility lives in
 *   the server-only `~/lib/local-delivery`).
 *
 * Isomorphic on purpose: client checkout forms, admin tables and emails all
 * import from here so the label for a method never drifts between surfaces.
 */
export const DELIVERY_METHODS = ["ship", "pickup", "delivery"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

/**
 * Reads an untrusted value (Stripe metadata, a DB string) back into a
 * `DeliveryMethod`. Anything unrecognised is `ship`, matching the column
 * default.
 */
export function parseDeliveryMethod(value: unknown): DeliveryMethod {
  return value === "pickup" || value === "delivery" ? value : "ship";
}

/** Whether the method needs a destination address. */
export function deliveryMethodNeedsAddress(method: DeliveryMethod): boolean {
  return method !== "pickup";
}

const LABELS: Record<DeliveryMethod, string> = {
  ship: "Shipping",
  pickup: "In-store pickup",
  delivery: "Local delivery",
};

/** Short customer- and owner-facing label, e.g. for a summary line. */
export function deliveryMethodLabel(method: DeliveryMethod): string {
  return LABELS[method];
}
