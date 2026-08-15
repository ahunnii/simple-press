import { z } from "zod";

/**
 * Shared contract for the two `SiteContent` JSON columns added for owner-editable
 * search metadata: `pageMeta` and `siteVerification`.
 *
 * Both are written ONLY by `business.updateSeo` and deliberately kept out of
 * `siteContentSchema`, so the branding editor, navigation builder and the
 * visual-editor publish transaction cannot reach them — the same protection
 * `bannerConfig` / `popupConfig` / `emailOverrides` already have.
 *
 * The `parse*` helpers below are the read path. They take `unknown` and never
 * throw: they run on every storefront request inside `generateMetadata`, and a
 * throw there kills the page render. Same contract as `parseBusinessHours`.
 */

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * Storefront routes that render from a template rather than a DB row, so they
 * have nowhere of their own to store a title or description. Each maps to its
 * public path and, where one exists, the feature flag that governs it — the
 * scorecard must not grade a route the owner has switched off.
 *
 * Adding a route here is all that's needed to make it owner-editable; the JSON
 * column means no migration. Keys are the storage keys inside `pageMeta`.
 */
export const STATIC_SEO_ROUTES = [
  { key: "about", path: "/about", label: "About", featureKey: null },
  { key: "contact", path: "/contact", label: "Contact", featureKey: null },
  { key: "shop", path: "/shop", label: "Shop", featureKey: "products" },
  { key: "blog", path: "/blog", label: "Blog", featureKey: "blog" },
  {
    key: "collections",
    path: "/collections",
    label: "Collections",
    featureKey: "collections",
  },
  {
    key: "services",
    path: "/services",
    label: "Services",
    featureKey: "services",
  },
  {
    key: "testimonials",
    path: "/testimonials",
    label: "Testimonials",
    featureKey: "testimonials",
  },
  { key: "faq", path: "/faq", label: "FAQ", featureKey: null },
  { key: "events", path: "/events", label: "Events", featureKey: "events" },
  { key: "videos", path: "/videos", label: "Videos", featureKey: "videos" },
] as const;

export type StaticSeoRoute = (typeof STATIC_SEO_ROUTES)[number];
export type StaticSeoRouteKey = StaticSeoRoute["key"];

const ROUTE_KEYS = new Set<string>(STATIC_SEO_ROUTES.map((r) => r.key));

// ─── pageMeta ─────────────────────────────────────────────────────────────────

/**
 * Length caps mirror the counters the SEO editor already shows (60 / 160) with
 * headroom, so a slightly-long value saves and is flagged as "written but
 * mis-sized" by the scorecard rather than being rejected outright.
 */
export const pageMetaEntrySchema = z.object({
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(500).optional(),
  ogImage: z.string().trim().max(2048).optional(),
});
export type PageMetaEntry = z.infer<typeof pageMetaEntrySchema>;

export const pageMetaSchema = z
  .record(z.string(), pageMetaEntrySchema)
  .superRefine((record, ctx) => {
    for (const key of Object.keys(record)) {
      if (!ROUTE_KEYS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `unknown page key: ${key}`,
        });
      }
    }
  });
export type PageMeta = z.infer<typeof pageMetaSchema>;

/**
 * Coerce the raw `pageMeta` JSON column into a clean map. Unknown route keys are
 * dropped rather than preserved — same rule as `resolveFlags`, so a route that
 * is later removed can't resurrect stale metadata. Blank strings are dropped so
 * downstream code can treat "present" as "meaningful" and fall through to the
 * site-wide value.
 */
export function parsePageMeta(value: unknown): PageMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: PageMeta = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ROUTE_KEYS.has(key)) continue;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;

    const entry = raw as Record<string, unknown>;
    const cleaned: PageMetaEntry = {};

    const title = readTrimmedString(entry.title);
    if (title !== null) cleaned.title = title;

    const description = readTrimmedString(entry.description);
    if (description !== null) cleaned.description = description;

    const ogImage = readTrimmedString(entry.ogImage);
    if (ogImage !== null) cleaned.ogImage = ogImage;

    if (Object.keys(cleaned).length > 0) result[key] = cleaned;
  }

  return result;
}

/** Convenience for a storefront route: the entry for one key, or an empty one. */
export function getPageMetaEntry(
  value: unknown,
  key: StaticSeoRouteKey,
): PageMetaEntry {
  return parsePageMeta(value)[key] ?? {};
}

// ─── siteVerification ─────────────────────────────────────────────────────────

/**
 * Search-engine ownership tokens. These are opaque strings the provider hands
 * the owner; we never interpret them, only echo them into a meta tag.
 *
 * Owners routinely paste the entire `<meta name="..." content="TOKEN" />` tag
 * rather than the token, so `parseSiteVerification` extracts the `content`
 * value when it sees markup — otherwise the tag would be emitted nested inside
 * another tag and silently fail verification.
 */
export const siteVerificationSchema = z.object({
  google: z.string().trim().max(255).optional(),
  bing: z.string().trim().max(255).optional(),
});
export type SiteVerification = z.infer<typeof siteVerificationSchema>;

const META_CONTENT_RE = /content\s*=\s*["']([^"']+)["']/i;

/** Pull the token out of a pasted `<meta>` tag, else return the trimmed input. */
export function normalizeVerificationToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.includes("<")) return trimmed;
  const match = META_CONTENT_RE.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

/** Coerce the raw `siteVerification` JSON column. Returns {} on anything odd. */
export function parseSiteVerification(value: unknown): SiteVerification {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const result: SiteVerification = {};

  const google = readTrimmedString(raw.google);
  if (google !== null) result.google = normalizeVerificationToken(google);

  const bing = readTrimmedString(raw.bing);
  if (bing !== null) result.bing = normalizeVerificationToken(bing);

  return result;
}

// ─── shared ───────────────────────────────────────────────────────────────────

/**
 * Read a JSON value as a non-blank trimmed string, else null.
 *
 * Note this treats `""` as absent. Owners who clear a field leave an empty
 * string behind, and every consumer here wants that to fall through to the
 * site-wide default rather than win — which is also why callers must not
 * collapse these with `??`.
 */
function readTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
