/**
 * Map-pin coordinates are moving from per-template fields (e.g.
 * `bamboo.global.map-lat` / `map-lng` saved in `SiteContent.customFields`)
 * to `Business.latitude` / `Business.longitude` (nullable `Float`). Templates
 * must prefer the Settings pair and silently fall back to whatever legacy
 * value they had saved, without ever writing back. This module centralizes
 * that resolution plus the Google Maps URL building every template contact
 * page duplicated. Pure and dependency-free.
 */

export type MapCoordinates = { latitude: number; longitude: number };
export type ResolvedMapCoordinates = MapCoordinates & {
  source: "settings" | "legacy";
};

/** typeof number, finite, and within -90..90 inclusive. */
export function isValidLatitude(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;
}

/** typeof number, finite, and within -180..180 inclusive. */
export function isValidLongitude(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;
}

// "@42.43,-83.14," from a Google Maps URL's `@lat,lng,zoom` segment.
const AT_PAIR_RE = /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),/;
// "?q=42.43,-83.14" / "query=42.43,-83.14", with or without the leading
// "?"/"&" (a pasted URL fragment may be missing it).
const QUERY_PAIR_RE =
  /[?&]?(?:query|q)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/;
// A bare pair: "42.43, -83.14" | "42.43 -83.14" | "42.43,-83.14".
const PLAIN_PAIR_RE = /^(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)$/;

function toValidPair(latStr: string, lngStr: string): MapCoordinates | null {
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Parses a pasted pair: "42.43, -83.14" | "42.43 -83.14" | "(42.43,-83.14)" |
 * "42.43,-83.14" | a Google Maps URL containing "@42.43,-83.14," or
 * "?q=42.43,-83.14" / "query=42.43,-83.14". Returns null unless both parse
 * and are in range.
 */
export function parseCoordinatePair(input: string): MapCoordinates | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const atMatch = AT_PAIR_RE.exec(trimmed);
  if (atMatch) return toValidPair(atMatch[1]!, atMatch[2]!);

  const queryMatch = QUERY_PAIR_RE.exec(trimmed);
  if (queryMatch) return toValidPair(queryMatch[1]!, queryMatch[2]!);

  const stripped = trimmed.replace(/^\(\s*/, "").replace(/\s*\)$/, "");
  const plainMatch = PLAIN_PAIR_RE.exec(stripped);
  if (plainMatch) return toValidPair(plainMatch[1]!, plainMatch[2]!);

  return null;
}

/** Parses one coordinate from string|number (trimmed; "" -> null). */
export function parseCoordinate(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Settings pair wins when BOTH are valid; otherwise the caller-supplied
 * legacy template values (raw strings/numbers -- caller decides whether
 * template defaults apply; bamboo passes raw saved values). Half pairs are
 * ignored. Never writes.
 */
export function resolveMapCoordinates(
  business:
    | { latitude?: number | null; longitude?: number | null }
    | null
    | undefined,
  legacyLat?: unknown,
  legacyLng?: unknown,
): ResolvedMapCoordinates | null {
  const settingsLat = business?.latitude;
  const settingsLng = business?.longitude;
  if (isValidLatitude(settingsLat) && isValidLongitude(settingsLng)) {
    return { latitude: settingsLat, longitude: settingsLng, source: "settings" };
  }

  const legacyLat_ = parseCoordinate(legacyLat);
  const legacyLng_ = parseCoordinate(legacyLng);
  if (isValidLatitude(legacyLat_) && isValidLongitude(legacyLng_)) {
    return { latitude: legacyLat_, longitude: legacyLng_, source: "legacy" };
  }

  return null;
}

/**
 * Google Maps view + directions URLs. A non-empty address string is
 * preferred (URL-encoded); otherwise "lat,lng".
 */
export function googleMapsUrls(
  dest: MapCoordinates | string,
): { viewUrl: string; directionsUrl: string } {
  const query =
    typeof dest === "string"
      ? encodeURIComponent(dest)
      : `${dest.latitude},${dest.longitude}`;
  return {
    viewUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
  };
}
