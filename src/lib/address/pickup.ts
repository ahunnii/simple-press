import { formatBusinessAddress } from "./format";

/**
 * The slice of `Business` the pickup-location fallback chain reads. Every
 * field is optional so callers with a narrow `select` still type-check; a
 * missing field just skips that step of the chain.
 */
export interface PickupLocationSource {
  pickupLocation?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  businessAddress?: string | null;
}

function nonBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Where customers collect pickup orders. One chain for every surface (admin
 * order page + print sheet, pickup emails, subscription orders, storefront
 * subscribe form), so they can't disagree:
 *
 *   1. `pickupLocation` — the owner's explicit pickup address (Shipping)
 *   2. the structured address (Street / City / State / ZIP) formatted with
 *      `formatBusinessAddress` — the same string General settings previews
 *   3. legacy one-line `businessAddress`
 *
 * Blank / whitespace-only values count as unset. Returns `null` when nothing
 * is configured.
 */
export function resolvePickupLocation(
  business: PickupLocationSource | null | undefined,
): string | null {
  if (!business) return null;
  return (
    nonBlank(business.pickupLocation) ??
    nonBlank(
      formatBusinessAddress({
        street: business.addressStreet,
        city: business.addressCity,
        state: business.addressState,
        postalCode: business.addressPostalCode,
      }),
    ) ??
    nonBlank(business.businessAddress)
  );
}
