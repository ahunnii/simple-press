/**
 * Great-circle distance between two lat/lng points, in statute miles.
 *
 * Pure and isomorphic on purpose — it has no imports at all, so both the
 * server-side quote evaluator (`src/lib/quote/evaluate.ts`) and any client
 * preview can call it and get bit-identical numbers. Determinism matters:
 * a stored quote's distance variable is snapshotted alongside the estimate,
 * so the same two zips must always produce the same miles.
 *
 * This is straight-line ("as the crow flies") distance, NOT driving distance.
 * Owners writing a pricing formula against a distance variable are pricing
 * off the crow-flies figure; the admin builder says so.
 */

/**
 * Mean Earth radius in miles. 3958.8 mi is the standard spherical-earth
 * approximation (6371.0 km). Fixed here rather than passed in so that every
 * caller in the codebase agrees on the constant — a distance that changes
 * with the caller would make stored quotes irreproducible.
 */
const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  // `Math.min(1, ...)` guards the antipodal case: floating-point error can
  // push `h` a hair above 1, and `Math.asin` of anything > 1 is NaN.
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}
