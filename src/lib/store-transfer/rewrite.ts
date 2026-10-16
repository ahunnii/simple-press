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
 * plus an optional `embedIdMaps` (form / quote-calculator ID remaps) for the
 * TipTap embed nodes that reference those records by id.
 *
 * Coverage is intentionally kept identical to usage.ts so that no media
 * reference is silently skipped. Any field type added to usage.ts must also
 * be handled here, and any column added to usage.ts must also be rewritten
 * in import.ts (whose post-import check reports misses via usage.ts).
 *
 * normalizeUrl is re-exported from src/lib/media/usage.ts (single source of
 * truth) — do NOT re-implement it here.
 */

import { normalizeUrl } from "~/lib/media/usage";
import { isStorageUrl } from "~/lib/s3/url";
import { SERVICE_TEMPLATE_FIELDS } from "~/lib/service-templates";
import {
  parseFormPictureFieldValue,
  TEMPLATE_FIELDS,
} from "~/lib/template-fields";

// Re-export normalizeUrl so callers can normalize keys before inserting
// into urlMap without importing from usage.ts directly.
export { normalizeUrl };

// ─── rewriteUrl ───────────────────────────────────────────────────────────────

/**
 * Look up a URL in the urlMap and return the replacement, or the original if
 * not found.  The lookup is performed on the normalized URL (query and
 * `#fragment` stripped) to match how keys were inserted into the map. A
 * fragment is carried over to the replacement — a link such as
 * `…/library-doc-ab12.pdf#page=3` keeps pointing at the same page.
 *
 * External (non-storage) URLs are returned unchanged.
 */
export function rewriteUrl(url: string, urlMap: Map<string, string>): string {
  if (!url || !isStorageUrl(url)) return url;
  const h = url.indexOf("#");
  const base = h >= 0 ? url.slice(0, h) : url;
  const fragment = h >= 0 ? url.slice(h) : "";
  const mapped = urlMap.get(normalizeUrl(base));
  return mapped ? mapped + fragment : url;
}

/**
 * Rewrite `link` marks' `attrs.href` (a Media Library PDF linked from rich
 * text — usage.ts walkTiptap reports the same hrefs). Returns the input array
 * when nothing changed.
 */
function rewriteLinkMarks(
  marks: unknown[],
  urlMap: Map<string, string>,
): unknown[] {
  let changed = false;
  const out = marks.map((mark) => {
    if (!mark || typeof mark !== "object" || Array.isArray(mark)) return mark;
    const m = mark as Record<string, unknown>;
    if (m.type !== "link") return mark;
    const attrs = m.attrs as Record<string, unknown> | undefined;
    const href = attrs?.href;
    if (typeof href !== "string" || !href) return mark;
    const next = rewriteUrl(href.trim(), urlMap);
    if (next === href.trim()) return mark;
    changed = true;
    return { ...m, attrs: { ...attrs, href: next } };
  });
  return changed ? out : marks;
}

// ─── Embed ID maps ────────────────────────────────────────────────────────────

/**
 * Source-id → target-id maps for TipTap nodes that embed a record by id.
 * Built by import.ts step 3b2 (forms + quote calculators) before any TipTap
 * or custom-field rewriting runs. Omitted/absent maps leave ids unchanged.
 */
export interface EmbedIdMaps {
  form?: Map<string, string>;
  quoteCalculator?: Map<string, string>;
}

/**
 * Remap the form id half of a `formpicture` value (`"<formId>:<fieldId>"`).
 * Field ids travel inside the copied form definition unchanged, so only the
 * form id needs the map. Unparseable values and unmapped ids pass through.
 */
function remapFormPictureValue(
  value: string,
  formMap: Map<string, string> | undefined,
): string {
  const picked = parseFormPictureFieldValue(value);
  if (!picked) return value;
  const formId = formMap?.get(picked.formId);
  return formId ? `${formId}:${picked.fieldId}` : value;
}

/** Return a copy of `attrs` with `attrs[key]` remapped via `map`, or null if nothing to remap. */
function remapAttr(
  attrs: Record<string, unknown> | undefined,
  key: string,
  map: Map<string, string> | undefined,
): Record<string, unknown> | null {
  if (!attrs) return null;
  const id = attrs[key];
  if (typeof id !== "string" || !id) return null;
  return { ...attrs, [key]: map?.get(id) ?? id };
}

// ─── rewriteTiptapDoc ─────────────────────────────────────────────────────────

/**
 * Deep-clone and rewrite a TipTap JSON document node.
 *
 *   image / video nodes → attrs.src rewritten via urlMap
 *   link marks (any node) → attrs.href rewritten via urlMap
 *   gallery nodes → attrs.galleryId rewritten via galleryIdMap
 *   form nodes    → attrs.formId rewritten via embedIdMaps.form
 *   quoteCalculator nodes → attrs.calculatorId rewritten via embedIdMaps.quoteCalculator
 *   embed nodes   → left intact (external iframe)
 *   all others    → recursed
 *
 * Forms and quote calculators travel in the manifest (since 2026-09-25), so
 * their embeds are remapped like galleries. An id with no map entry (older
 * bundle without those keys, or a row skipped on import) passes through
 * unchanged — the storefront renders a graceful placeholder for a dangling id.
 *
 * Returns a new object — the input is never mutated.
 */
export function rewriteTiptapDoc(
  node: unknown,
  urlMap: Map<string, string>,
  galleryIdMap: Map<string, string>,
  embedIdMaps?: EmbedIdMaps,
): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;

  const n = node as Record<string, unknown>;

  // Shallow-clone this node so we don't mutate the original
  const result: Record<string, unknown> = { ...n };

  if (Array.isArray(n.marks)) {
    result.marks = rewriteLinkMarks(n.marks, urlMap);
  }

  // `video` nodes carry an uploaded clip's URL in `attrs.src` exactly like
  // `image` nodes (usage.ts walkTiptap treats them the same way).
  if (n.type === "image" || n.type === "video") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (attrs) {
      const src = attrs.src;
      if (typeof src === "string" && src) {
        result.attrs = { ...attrs, src: rewriteUrl(src, urlMap) };
      }
    }
  } else if (n.type === "gallery") {
    const attrs = remapAttr(
      n.attrs as Record<string, unknown> | undefined,
      "galleryId",
      galleryIdMap,
    );
    if (attrs) result.attrs = attrs;
  } else if (n.type === "form") {
    // Node/attr names: src/components/ui/minimal-tiptap/extensions/form
    const attrs = remapAttr(
      n.attrs as Record<string, unknown> | undefined,
      "formId",
      embedIdMaps?.form,
    );
    if (attrs) result.attrs = attrs;
  } else if (n.type === "quoteCalculator") {
    // Node/attr names: src/components/ui/minimal-tiptap/extensions/quote-calculator
    const attrs = remapAttr(
      n.attrs as Record<string, unknown> | undefined,
      "calculatorId",
      embedIdMaps?.quoteCalculator,
    );
    if (attrs) result.attrs = attrs;
  }
  // "embed" → intentionally left intact (mirrors usage.ts)

  // Recurse into content array
  const content = n.content;
  if (Array.isArray(content)) {
    result.content = content.map((child: unknown) =>
      rewriteTiptapDoc(child, urlMap, galleryIdMap, embedIdMaps),
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
 * @param opts.serviceTemplateId  A service's `serviceTemplateId`; activates the same
 *                     gallery-field remapping against `SERVICE_TEMPLATE_FIELDS`
 *                     (for `Service.customFields`, whose gallery-type fields —
 *                     `service-two.gallery`, `dream-lane.gallery`, … — are NOT in
 *                     the site-template registry)
 * @param opts._fieldKey   (internal) current field key being walked; used for gallery detection
 * @param embedIdMaps  Optional form / quote-calculator id remaps, applied to
 *                     any TipTap doc found inside `value` (see rewriteTiptapDoc)
 */
export function rewriteJsonValue(
  value: unknown,
  urlMap: Map<string, string>,
  galleryIdMap: Map<string, string>,
  opts?: {
    templateId?: string;
    serviceTemplateId?: string;
    _fieldKey?: string;
  },
  embedIdMaps?: EmbedIdMaps,
): unknown {
  if (value === null || value === undefined) return value;

  const templateId = opts?.templateId;
  const serviceTemplateId = opts?.serviceTemplateId;
  const fieldKey = opts?._fieldKey;

  // ── String value ───────────────────────────────────────────────────────────
  if (typeof value === "string") {
    // If this is a gallery-type field value (and we know the templateId),
    // remap via galleryIdMap instead of treating it as a URL.
    if (fieldKey && serviceTemplateId) {
      const svcField = SERVICE_TEMPLATE_FIELDS[serviceTemplateId]?.find(
        (f) => f.key === fieldKey,
      );
      if (svcField?.type === "gallery") {
        return galleryIdMap.get(value) ?? value;
      }
      if (svcField?.type === "formpicture") {
        return remapFormPictureValue(value, embedIdMaps?.form);
      }
    }
    if (templateId && fieldKey) {
      const fields = TEMPLATE_FIELDS[templateId];
      if (fields) {
        // Build a map on-the-fly (small; called per-field, not per-document)
        const field = fields.find((f) => f.key === fieldKey);
        if (field?.type === "gallery") {
          return galleryIdMap.get(value) ?? value;
        }
        if (field?.type === "formpicture") {
          return remapFormPictureValue(value, embedIdMaps?.form);
        }
      }
    }
    return rewriteUrl(value, urlMap);
  }

  // ── Array ──────────────────────────────────────────────────────────────────
  if (Array.isArray(value)) {
    return value.map((item: unknown) =>
      rewriteJsonValue(item, urlMap, galleryIdMap, opts, embedIdMaps),
    );
  }

  // ── Object ─────────────────────────────────────────────────────────────────
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Detect TipTap document (mirrors deepWalkJson heuristic)
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return rewriteTiptapDoc(obj, urlMap, galleryIdMap, embedIdMaps);
    }

    // For top-level custom-field objects, iterate per-key so each key's value
    // can be checked against the gallery-type predicate.
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = rewriteJsonValue(
        v,
        urlMap,
        galleryIdMap,
        { templateId, serviceTemplateId, _fieldKey: k },
        embedIdMaps,
      );
    }
    return result;
  }

  // Number, boolean, etc. — returned as-is
  return value;
}
