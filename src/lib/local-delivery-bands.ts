import { z } from "zod";

/**
 * Local delivery distance bands — closer prices inside the delivery radius.
 *
 * Stored in `Business.localDeliveryBands` (Json). The radius itself is still
 * `localDeliveryRadiusMiles` and `localDeliveryFeeCents` is the price for
 * everything inside it that no band covers, so a store with no bands prices
 * exactly as before. Example: radius 15, fee $5, bands
 * `[{ upToMiles: 5, feeCents: 0 }]` → free within 5 miles, $5 out to 15.
 *
 * Isomorphic on purpose: the server picks the fee (`~/lib/local-delivery`),
 * the checkout hook only describes the range, and the admin form validates
 * with the same schema.
 */

export const MAX_LOCAL_DELIVERY_BANDS = 3;

export const localDeliveryBandSchema = z.object({
  upToMiles: z.number().int().min(1).max(100),
  feeCents: z.number().int().min(0),
});

export type LocalDeliveryBand = z.infer<typeof localDeliveryBandSchema>;

/**
 * Reads the stored JSON back into bands: drops malformed rows, rows at or
 * beyond the radius (they could never apply) and duplicate mile limits
 * (first wins), then sorts nearest first and caps at
 * `MAX_LOCAL_DELIVERY_BANDS`. Never throws — a bad row must not take
 * checkout down.
 */
export function parseLocalDeliveryBands(
  value: unknown,
  radiusMiles: number | null,
): LocalDeliveryBand[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const bands: LocalDeliveryBand[] = [];
  for (const row of value) {
    const parsed = localDeliveryBandSchema.safeParse(row);
    if (!parsed.success) continue;
    const band = parsed.data;
    if (radiusMiles != null && band.upToMiles >= radiusMiles) continue;
    if (seen.has(band.upToMiles)) continue;
    seen.add(band.upToMiles);
    bands.push(band);
  }
  bands.sort((a, b) => a.upToMiles - b.upToMiles);
  return bands.slice(0, MAX_LOCAL_DELIVERY_BANDS);
}

/**
 * The fee for a distance: the nearest band whose `upToMiles` covers it
 * (inclusive), otherwise the radius-wide fee. Callers check the radius
 * first. `bands` must come from `parseLocalDeliveryBands`.
 */
export function localDeliveryFeeForMiles(
  miles: number,
  bands: readonly LocalDeliveryBand[],
  baseFeeCents: number,
): number {
  const band = bands.find((b) => miles <= b.upToMiles);
  return Math.max(0, band ? band.feeCents : baseFeeCents);
}

/** Cheapest and dearest fee a shopper could see, for "from $X" copy. */
export function localDeliveryFeeRange(
  bands: readonly LocalDeliveryBand[],
  baseFeeCents: number,
): { minCents: number; maxCents: number } {
  const fees = [...bands.map((b) => b.feeCents), baseFeeCents].map((f) =>
    Math.max(0, f),
  );
  return { minCents: Math.min(...fees), maxCents: Math.max(...fees) };
}
