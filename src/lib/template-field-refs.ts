/**
 * Template-field reference collector — the read-only counterpart used by the
 * admin template-fields JSON *import* flow to warn about references that
 * won't resolve in the target business (storage files, gallery/collection
 * ids, FAQ ids, form ids, quote-calculator ids).
 *
 * Coverage is intentionally kept identical to `rewriteJsonValue` /
 * `rewriteTiptapDoc` in `src/lib/store-transfer/rewrite.ts` (which itself
 * mirrors the exhaustive scanner in `src/lib/media/usage.ts`) — this module
 * *collects* references instead of rewriting them. Any reference type added
 * to those rewrite helpers must also be added here, and vice versa.
 *
 * Client-safe by design: no server-only imports. Do NOT import
 * `src/lib/store-transfer/rewrite.ts` or `src/lib/media/usage.ts` from this
 * file — both pull in `~/server/db`.
 */

import { isStorageUrl } from "~/lib/s3/url";
import { parseFaqPickerIds, TEMPLATE_FIELDS } from "~/lib/template-fields";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TemplateFieldRefIds = {
  gallery: string[];
  collection: string[];
  faq: string[];
  form: string[];
  quoteCalculator: string[];
};

export type TemplateFieldRefs = {
  storageUrls: string[];
  ids: TemplateFieldRefIds;
};

/** Mutable per-collection accumulator; `[...set]` at the end for the public shape. */
type RefSets = {
  gallery: Set<string>;
  collection: Set<string>;
  faq: Set<string>;
  form: Set<string>;
  quoteCalculator: Set<string>;
};

function emptyRefSets(): RefSets {
  return {
    gallery: new Set(),
    collection: new Set(),
    faq: new Set(),
    form: new Set(),
    quoteCalculator: new Set(),
  };
}

export function emptyRefIds(): TemplateFieldRefIds {
  return { gallery: [], collection: [], faq: [], form: [], quoteCalculator: [] };
}

// ─── TipTap doc walk ────────────────────────────────────────────────────────

/**
 * Walk a TipTap JSON node collecting references. Mirrors the node/attr
 * coverage of `rewriteTiptapDoc` in store-transfer/rewrite.ts:
 *
 *   image / video nodes    → attrs.src        (storage URL only)
 *   gallery nodes          → attrs.galleryId
 *   form nodes             → attrs.formId          (src/components/ui/minimal-tiptap/extensions/form)
 *   quoteCalculator nodes  → attrs.calculatorId     (src/components/ui/minimal-tiptap/extensions/quote-calculator)
 *   embed nodes            → left intact (external iframe, mirrors rewrite.ts)
 *   all others             → recursed via `content`
 */
function collectTiptapRefs(node: unknown, storageUrls: Set<string>, ids: RefSets): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const n = node as Record<string, unknown>;
  const attrs = n.attrs as Record<string, unknown> | undefined;

  if (n.type === "image" || n.type === "video") {
    const src = attrs?.src;
    if (typeof src === "string" && src && isStorageUrl(src)) storageUrls.add(src);
  } else if (n.type === "gallery") {
    const galleryId = attrs?.galleryId;
    if (typeof galleryId === "string" && galleryId) ids.gallery.add(galleryId);
  } else if (n.type === "form") {
    const formId = attrs?.formId;
    if (typeof formId === "string" && formId) ids.form.add(formId);
  } else if (n.type === "quoteCalculator") {
    const calculatorId = attrs?.calculatorId;
    if (typeof calculatorId === "string" && calculatorId) ids.quoteCalculator.add(calculatorId);
  }

  const content = n.content;
  if (Array.isArray(content)) {
    for (const child of content) collectTiptapRefs(child, storageUrls, ids);
  }
}

// ─── Generic JSON walk ──────────────────────────────────────────────────────

/**
 * Deep-walk any JSON value collecting storage URLs and embedded TipTap
 * references. Mirrors `rewriteJsonValue`'s generic (non gallery/collection/
 * faq field) coverage:
 *
 *   string        → storage URL if `isStorageUrl`; else ignored
 *   {type:"doc"}  → `collectTiptapRefs`
 *   array/object  → recursed (covers `list`-type field rows and any other
 *                   nested shape)
 */
function collectJsonRefs(value: unknown, storageUrls: Set<string>, ids: RefSets): void {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    if (isStorageUrl(value)) storageUrls.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectJsonRefs(item, storageUrls, ids);
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (obj.type === "doc" && Array.isArray(obj.content)) {
      collectTiptapRefs(obj, storageUrls, ids);
      return;
    }

    for (const v of Object.values(obj)) collectJsonRefs(v, storageUrls, ids);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Collect every storage URL / referenced-record id out of a template's
 * saved field values, keyed by field key. Only keys with at least one
 * storage URL or id appear in the result.
 *
 * Field-type handling (looked up via `TEMPLATE_FIELDS[templateId]`, key
 * match):
 *   `gallery` / `collection` → the field's string value IS the id
 *     (`""` and `"none"` mean unset — no id)
 *   `faq`                    → ids parsed via `parseFaqPickerIds`
 *   everything else          → generic deep walk (`collectJsonRefs`), which
 *     also covers `list`-type rows and any TipTap `richtext` doc
 *
 * A field key absent from the template's registry (stale/orphaned key) is
 * still generically deep-walked — we just don't know a more specific type
 * for it — so it can't hide a dangling storage URL.
 */
export function collectTemplateFieldRefs(
  templateId: string,
  fields: Record<string, unknown>,
): Record<string, TemplateFieldRefs> {
  const result: Record<string, TemplateFieldRefs> = {};
  if (!fields || typeof fields !== "object") return result;

  const templateFields = TEMPLATE_FIELDS[templateId];
  const fieldByKey = new Map((templateFields ?? []).map((f) => [f.key, f]));

  for (const [key, value] of Object.entries(fields)) {
    const field = fieldByKey.get(key);
    const storageUrls = new Set<string>();
    const ids = emptyRefSets();

    if (field?.type === "gallery" || field?.type === "collection") {
      if (typeof value === "string" && value !== "" && value !== "none") {
        ids[field.type].add(value);
      }
    } else if (field?.type === "faq") {
      const faqIds = parseFaqPickerIds(value);
      if (faqIds) for (const id of faqIds) ids.faq.add(id);
    } else {
      collectJsonRefs(value, storageUrls, ids);
    }

    const refIds: TemplateFieldRefIds = {
      gallery: [...ids.gallery],
      collection: [...ids.collection],
      faq: [...ids.faq],
      form: [...ids.form],
      quoteCalculator: [...ids.quoteCalculator],
    };

    const hasAny =
      storageUrls.size > 0 || Object.values(refIds).some((arr) => arr.length > 0);
    if (hasAny) {
      result[key] = { storageUrls: [...storageUrls], ids: refIds };
    }
  }

  return result;
}

/** Union + dedupe ids across all keys (for the ownership check call). */
export function mergeRefIds(
  refs: Record<string, TemplateFieldRefs>,
): TemplateFieldRefIds {
  const seen = emptyRefSets();
  const out = emptyRefIds();

  for (const key of Object.keys(seen) as (keyof TemplateFieldRefIds)[]) {
    for (const entry of Object.values(refs)) {
      for (const id of entry.ids[key]) {
        if (!seen[key].has(id)) {
          seen[key].add(id);
          out[key].push(id);
        }
      }
    }
  }

  return out;
}
