import "server-only";

import { haversineMiles } from "~/lib/geo/haversine";
import { lookupZip } from "~/lib/geo/zip-lookup";
import {
  localDeliveryFeeForMiles,
  parseLocalDeliveryBands,
} from "~/lib/local-delivery-bands";

/**
 * Local delivery eligibility — the owner drives the order to customers within
 * `localDeliveryRadiusMiles` of their origin ZIP.
 *
 * Distance is ZIP-centroid to ZIP-centroid, straight-line (haversine), so it
 * is approximate by design: a street address near the edge of a ZIP can land
 * either side of the radius. US only — the dataset is US ZIPs.
 *
 * PRIVACY: the computed distance never leaves this module. Not in a return
 * value, not in a log line, not in a thrown error. A shopper who could read
 * "12.4 miles" back for a few ZIPs could triangulate the owner's origin ZIP
 * (which may be a home address that is deliberately not public). Callers get
 * eligible / not eligible and a coarse reason, nothing finer.
 *
 * Server-only because `lookupZip` lazily loads a ~1.8MB dataset.
 */

/** The Business columns eligibility depends on. */
export type LocalDeliverySettings = {
  offersLocalDelivery: boolean;
  /** Blank → falls back to `addressPostalCode`. */
  localDeliveryOriginZip: string | null;
  addressPostalCode: string | null;
  localDeliveryRadiusMiles: number | null;
  /** Price for anything inside the radius that no band covers. */
  localDeliveryFeeCents: number;
  /**
   * Stored `Business.localDeliveryBands` JSON — optional closer prices
   * (`~/lib/local-delivery-bands`). Parsed defensively: malformed or
   * at/over-radius rows are ignored, so bad data falls back to the base fee.
   */
  localDeliveryBands: unknown;
  /** Compared against the PRE-discount subtotal. Null / ≤ 0 = no minimum. */
  localDeliveryMinOrderCents: number | null;
};

export type LocalDeliveryIneligibleReason =
  | "not_offered"
  | "no_origin"
  | "not_us"
  | "unknown_zip"
  | "out_of_range"
  | "below_minimum";

export type LocalDeliveryResult =
  | { eligible: true; feeCents: number }
  | {
      eligible: false;
      reason: LocalDeliveryIneligibleReason;
      /** Only set for `below_minimum`. */
      minOrderCents?: number;
      /**
       * Only set for `below_minimum`: the fee this address WOULD pay once the
       * minimum is met (the address is in range), so a client that knows the
       * real subtotal clears the minimum can still show the right band price.
       */
      feeCents?: number;
    };

const US_ZIP = /^(\d{5})(?:-?\d{4})?$/;

/**
 * Normalizes a US ZIP to its 5-digit form. Accepts surrounding / inner
 * whitespace and ZIP+4 (`48601-1234`, `486011234`). Anything else is `null`.
 */
export function normalizeUsZip(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const compact = input.replace(/\s+/g, "");
  const match = US_ZIP.exec(compact);
  return match?.[1] ?? null;
}

/**
 * The ZIP deliveries are measured from: the dedicated origin ZIP when set,
 * otherwise the business's own postal code. Returns `null` when neither is a
 * valid US ZIP.
 */
export function resolveDeliveryOriginZip(settings: {
  localDeliveryOriginZip: string | null;
  addressPostalCode: string | null;
}): string | null {
  const own = settings.localDeliveryOriginZip?.trim();
  if (own) return normalizeUsZip(own);
  return normalizeUsZip(settings.addressPostalCode ?? "");
}

/**
 * City / state for an origin ZIP, for the admin settings confirmation line
 * ("Measured from 48601 (Saginaw, MI)"). `null` when the ZIP is malformed or
 * not in the dataset. Never returns coordinates.
 */
export async function lookupOriginPlace(
  zip: string,
): Promise<{ city: string; state: string } | null> {
  const normalized = normalizeUsZip(zip);
  if (!normalized) return null;
  const entry = await lookupZip(normalized);
  return entry ? { city: entry.city, state: entry.state } : null;
}

export async function checkLocalDelivery(input: {
  settings: LocalDeliverySettings;
  destinationZip: string | null | undefined;
  destinationCountry: string | null | undefined;
  /** Pre-discount subtotal, from server-side prices. */
  subtotalCents: number;
}): Promise<LocalDeliveryResult> {
  const { settings, destinationZip, destinationCountry, subtotalCents } = input;

  const radius = settings.localDeliveryRadiusMiles;
  if (!settings.offersLocalDelivery || radius == null || radius <= 0) {
    return { eligible: false, reason: "not_offered" };
  }

  if ((destinationCountry ?? "").trim().toUpperCase() !== "US") {
    return { eligible: false, reason: "not_us" };
  }

  const originZip = resolveDeliveryOriginZip(settings);
  const origin = originZip ? await lookupZip(originZip) : null;
  if (!origin) {
    return { eligible: false, reason: "no_origin" };
  }

  const destZip = normalizeUsZip(destinationZip ?? "");
  const destination = destZip ? await lookupZip(destZip) : null;
  if (!destination) {
    return { eligible: false, reason: "unknown_zip" };
  }

  // Inclusive: exactly at the radius delivers. See the PRIVACY note above —
  // `miles` stays in this scope.
  const miles = haversineMiles(origin, destination);
  if (miles > radius) {
    return { eligible: false, reason: "out_of_range" };
  }

  // Only the chosen fee leaves this function — never `miles`, and never which
  // band matched. (The fee alone can hint at a band; that's the price the
  // shopper pays, so it is public by nature.)
  const feeCents = localDeliveryFeeForMiles(
    miles,
    parseLocalDeliveryBands(settings.localDeliveryBands, radius),
    settings.localDeliveryFeeCents,
  );

  // Distance before minimum: adding items can't fix an out-of-range address,
  // so that is the more useful thing to tell the shopper first.
  const min = settings.localDeliveryMinOrderCents;
  if (min != null && min > 0 && subtotalCents < min) {
    return {
      eligible: false,
      reason: "below_minimum",
      minOrderCents: min,
      feeCents,
    };
  }

  return { eligible: true, feeCents };
}
