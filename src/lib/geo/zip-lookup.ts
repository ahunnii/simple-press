import "server-only";

/**
 * zip-lookup.ts
 *
 * Server-only US ZIP code → centroid lookup, backed by a static dataset
 * generated from GeoNames' US postal-code dump (CC-BY 4.0,
 * http://download.geonames.org/export/zip/US.zip). Used by the quote
 * calculator to resolve a customer-entered ZIP to city/state (for UI
 * feedback) and to a lat/lng centroid (for straight-line distance in quote
 * formulas — see the sibling `haversine.ts`, owned separately).
 *
 * Regenerate the dataset with: node scripts/generate-zip-data.mjs
 *
 * `import "server-only"` keeps this — and the ~1.7MB dataset it lazily
 * loads — out of any client bundle. Never import this module from a "use
 * client" component.
 */

export type ZipEntry = {
  lat: number;
  lng: number;
  city: string;
  state: string;
};

// Raw dataset shape: zip -> [lat, lng, city, stateCode]
type ZipDataRaw = Record<string, [number, number, string, string]>;

// Lazily initialized + memoized so the ~1.7MB JSON is only parsed once, on
// first use, and never during Next.js build/static generation.
let datasetPromise: Promise<ReadonlyMap<string, ZipEntry>> | null = null;

/**
 * Loads (and memoizes) the full ZIP -> centroid dataset as a Map. Callers
 * that need to resolve many ZIPs in one request (e.g. the quote submit
 * router) should await this once and then read from the returned Map
 * synchronously, rather than calling `lookupZip` in a loop.
 */
export async function loadZipDataset(): Promise<ReadonlyMap<string, ZipEntry>> {
  datasetPromise ??= (async () => {
    // The JSON file has ~41k top-level keys — letting TS infer its literal
    // structural type (via resolveJsonModule) produces an object type with
    // one property per ZIP code, which then fails to compare against the
    // tuple-shaped ZipDataRaw ("(string | number)[]" vs the 4-tuple). Route
    // through `unknown` to apply the intended shape directly instead.
    const mod = (await import("./zip-data.json")) as unknown as {
      default: ZipDataRaw;
    };
    const raw = mod.default;

    const map = new Map<string, ZipEntry>();
    for (const zip of Object.keys(raw)) {
      const entry = raw[zip];
      if (!entry) continue;
      const [lat, lng, city, state] = entry;
      map.set(zip, { lat, lng, city, state });
    }
    return map;
  })();

  return datasetPromise;
}

const FIVE_DIGIT_ZIP = /^\d{5}$/;

/**
 * Resolves a single ZIP code to its centroid + city/state. Returns `null`
 * for malformed input (not exactly 5 digits) or a well-formed ZIP that
 * isn't in the dataset.
 */
export async function lookupZip(zip: string): Promise<ZipEntry | null> {
  if (!FIVE_DIGIT_ZIP.test(zip)) return null;

  const dataset = await loadZipDataset();
  return dataset.get(zip) ?? null;
}
