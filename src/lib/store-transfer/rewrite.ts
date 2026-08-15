/**
 * Store Transfer — transform-walker helpers.
 *
 * These are the rewriting counterparts to the read-only walkers in
 * src/lib/media/usage.ts. Where usage.ts *collects* URLs, these helpers
 * *replace* them using two maps:
 *
 *   urlMap      Map<normalizedOldUrl, newUrl>   — S3 URL rewrites
 *   galleryIdMap Map<oldGalleryId, newGalleryId> — gallery ID remaps
 *
 * Coverage is intentionally kept identical to usage.ts so that no media
 * reference is silently skipped. Any field type added to usage.ts must also
 * be handled here.
 *
 * normalizeUrl is re-exported from src/lib/media/usage.ts (single source of
 * truth) — do NOT re-implement it here.
 */

import { normalizeUrl } from "~/lib/media/usage";
import { isStorageUrl } from "~/lib/s3/url";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";

// Re-export normalizeUrl so callers can normalize keys before inserting
// into urlMap without importing from usage.ts directly.
export { normalizeUrl };

// ─── rewriteUrl ───────────────────────────────────────────────────────────────

/**
 * Look up a URL in the urlMap and return the replacement, or the original if
 * not found.  The lookup is performed on the normalized URL (query stripped)
 * to match how keys were inserted into the map.
 *
 * External (non-storage) URLs are returned unchanged.
 */
export function rewriteUrl(url: string, urlMap: Map<string, string>): string {
  if (!url || !isStorageUrl(url)) return url;
  const normalized = normalizeUrl(url);
  return urlMap.get(normalized) ?? url;
}

// ─── rewriteTiptapDoc ─────────────────────────────────────────────────────────

/**
 * Deep-clone and rewrite a TipTap JSON document node.
 *
 *   image nodes   → attrs.src rewritten via urlMap
 *   gallery nodes → attrs.galleryId rewritten via galleryIdMap
 *   embed nodes   → left intact (external iframe)
 *   quoteCalculator nodes → left intact (calculators are not part of the transfer manifest; v1 tradeoff — a dangling calculatorId renders a graceful placeholder on the storefront)
 *   all others    → recursed
 *
 * Returns a new object — the input is never mutated.
 */
export function rewriteTiptapDoc(
  node: unknown,
  urlMap: Map<string, string>,
  galleryIdMap: Map<string, string>,
): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;

  const n = node as Record<string, unknown>;

  // Shallow-clone this node so we don't mutate the original
  const result: Record<string, unknown> = { ...n };

  if (n.type === "image") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (attrs) {
      const src = attrs.src;
      if (typeof src === "string" && src) {
        result.attrs = { ...attrs, src: rewriteUrl(src, urlMap) };
      }
    }
  } else if (n.type === "gallery") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (attrs) {
      const galleryId = attrs.galleryId;
      if (typeof galleryId === "string" && galleryId) {
        result.attrs = {
          ...attrs,
          galleryId: galleryIdMap.get(galleryId) ?? galleryId,
        };
      }
    }
  }
  // "embed" → intentionally left intact (mirrors usage.ts)
  // "quoteCalculator" → intentionally left intact (calculators are not part of the transfer manifest)

  // Recurse into content array
  const content = n.content;
  if (Array.isArray(content)) {
    result.content = content.map((child: unknown) =>
      rewriteTiptapDoc(child, urlMap, galleryIdMap),
    );
  }

  return result;
}

// ─── rewriteJsonValue ─────────────────────────────────────────────────────────

/**
 * Deep-clone and rewrite any JSON value (scalar, array, or object).
 *
 * Mirrors deepWalkJson from usage.ts but rewrites rather than collects:
 *   string        → rewriteUrl if it's a storage URL; else unchanged
 *   {type:"doc"}  → rewriteTiptapDoc
 *   array/object  → recursed
 *
 * When `opts.templateId` is provided, gallery-type custom fields in
 * SiteContent are remapped via galleryIdMap rather than treated as URL
 * strings.  This matches the scanCustomFields pass in usage.ts.
 *
 * @param value        JSON value to rewrite
 * @param urlMap       Old-URL → new-URL map (keys are normalized source URLs)
 * @param galleryIdMap Old-galleryId → new-galleryId map
 * @param opts.templateId  The manifest's templateId; activates gallery-field remapping
 * @param opts._fieldKey   (internal) current field key being walked; used for gallery detection
 */
export function rewriteJsonValue(
  value: unknown,
  urlMap: Map<string, string>,
  galleryIdMap: Map<string, string>,
  opts?: { templateId?: string; _fieldKey?: string },
): unknown {
  if (value === null || value === undefined) return value;

  const templateId = opts?.templateId;
  const fieldKey = opts?._fieldKey;

  // ── String value ───────────────────────────────────────────────────────────
  if (typeof value === "string") {
    // If this is a gallery-type field value (and we know the templateId),
    // remap via galleryIdMap instead of treating it as a URL.
    if (templateId && fieldKey) {
      const fields = TEMPLATE_FIELDS[templateId];
      if (fields) {
        // Build a map on-the-fly (small; called per-field, not per-document)
        const field = fields.find((f) => f.key === fieldKey);
        if (field?.type === "gallery") {
          return galleryIdMap.get(value) ?? value;
        }
      }
    }
    return rewriteUrl(value, urlMap);
  }

  // ── Array ──────────────────────────────────────────────────────────────────
  if (Array.isArray(value)) {
    return value.map((item: unknown) =>
      rewriteJsonValue(item, urlMap, galleryIdMap, opts),
    );
  }

  // ── Object ─────────────────────────────────────────────────────────────────
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Detect TipTap document (mirrors deepWalkJson heuristic)
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return rewriteTiptapDoc(obj, urlMap, galleryIdMap);
    }

    // For top-level custom-field objects, iterate per-key so each key's value
    // can be checked against the gallery-type predicate.
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = rewriteJsonValue(v, urlMap, galleryIdMap, {
        templateId,
        _fieldKey: k,
      });
    }
    return result;
  }

  // Number, boolean, etc. — returned as-is
  return value;
}
