/**
 * Local presence — shared constant/type/parsers for `Business.localPresence`
 * and `Business.areaServed`.
 *
 * Client-safe (no `server-only`, no Prisma import): this module is imported
 * from both server code (structured-data builders, the business router,
 * the scorecard) and client components (the SEO editor form).
 *
 * `localPresence` replaces the old `localBusinessEnabled` boolean so a
 * business can honestly signal one of three postures:
 *  - "none": online-only, no location is published.
 *  - "service_area": has a city/region it serves, but no public storefront —
 *    only city/state show, never a street address.
 *  - "storefront": customers can visit — full address, phone and hours.
 */

export const LOCAL_PRESENCE_MODES = [
  "none",
  "service_area",
  "storefront",
] as const;

export type LocalPresence = (typeof LOCAL_PRESENCE_MODES)[number];

const LOCAL_PRESENCE_MODE_SET = new Set<string>(LOCAL_PRESENCE_MODES);

/**
 * Parse a raw (possibly unknown/legacy/corrupt) value into a `LocalPresence`,
 * falling back to `"none"` for anything that isn't one of the three known
 * modes — including `null`/`undefined`/empty string.
 */
export function parseLocalPresence(
  value: string | null | undefined,
): LocalPresence {
  if (
    value !== null &&
    value !== undefined &&
    LOCAL_PRESENCE_MODE_SET.has(value)
  ) {
    return value as LocalPresence;
  }
  return "none";
}

const AREA_SERVED_MAX_ENTRIES = 20;
const AREA_SERVED_MAX_LENGTH = 80;

/**
 * Clean up owner-entered "areas served" entries before they're stored or
 * emitted in JSON-LD: trim whitespace, drop blanks, dedupe case-insensitively
 * (keeping the first spelling seen), cap the list at 20 entries, and cap each
 * entry at 80 characters.
 */
export function normalizeAreaServed(input: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    const capped =
      trimmed.length > AREA_SERVED_MAX_LENGTH
        ? trimmed.slice(0, AREA_SERVED_MAX_LENGTH)
        : trimmed;

    const key = capped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push(capped);
    if (result.length >= AREA_SERVED_MAX_ENTRIES) break;
  }

  return result;
}
