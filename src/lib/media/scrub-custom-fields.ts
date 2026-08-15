/**
 * Pure removal of media URLs from a `SiteContent.customFields`-shaped JSON blob.
 *
 * ## Caller contract
 *
 * This is the write-side counterpart of `buildUsedMediaIndex` (`./usage.ts`) and
 * is only ever invoked for files whose usages are ALL flagged
 * `inactiveTemplate` — i.e. the file is referenced solely by field values left
 * behind by a template the owner switched away from. Because such a file is by
 * definition not referenced by any active-template field, scrubbing the whole
 * blob cannot touch a value the live storefront renders.
 *
 * Do NOT call this for a file that has even one active usage: the scrub is
 * blob-wide, not template-scoped, and would silently blank live content.
 *
 * The function never mutates its input — unchanged branches are shared by
 * reference, changed ones are rebuilt.
 */

/** The reserved visual-editor metadata key. Never read, scrubbed, or descended into. */
const RESERVED_METADATA_KEY = "_sp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * True when `value` names one of the scrubbed URLs.
 *
 * Matching is exact, plus a query-string-stripped comparison: the usage index
 * keys everything through `normalizeUrl`, so a caller working from that index
 * holds normalized URLs while the blob may still store `…/a.jpg?v=2`.
 */
function isScrubbedUrl(value: string, urls: ReadonlySet<string>): boolean {
  if (urls.has(value)) return true;
  const q = value.indexOf("?");
  return q >= 0 && urls.has(value.slice(0, q));
}

/**
 * TipTap document detection — deliberately identical to `deepWalkJson`'s
 * heuristic in `./usage.ts` (`{ type: "doc", content: [...] }`). Anything the
 * read side does not treat as a document is scrubbed as plain JSON here, so the
 * two sides can never disagree about what is a rich-text node.
 */
function isTiptapDoc(value: Record<string, unknown>): boolean {
  return value.type === "doc" && Array.isArray(value.content);
}

/**
 * True for a rich-text node that points AT one of the scrubbed URLs via
 * `attrs.src` — the attribute `walkTiptap` reads for `image` nodes. Such nodes
 * are removed outright rather than blanked: an image node with an empty `src`
 * renders as a broken image.
 */
function isScrubbedMediaNode(
  node: Record<string, unknown>,
  urls: ReadonlySet<string>,
): boolean {
  const attrs = node.attrs;
  if (!isRecord(attrs)) return false;
  const src = attrs.src;
  return typeof src === "string" && src !== "" && isScrubbedUrl(src, urls);
}

type ScrubResult = { value: unknown; changed: boolean };

/** Scrub the children of a rich-text node, dropping media nodes entirely. */
function scrubTiptapNode(
  node: Record<string, unknown>,
  urls: ReadonlySet<string>,
): ScrubResult {
  let changed = false;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "content" && Array.isArray(value)) {
      let contentChanged = false;
      const children: unknown[] = [];
      for (const child of value) {
        if (isRecord(child)) {
          if (isScrubbedMediaNode(child, urls)) {
            contentChanged = true;
            continue;
          }
          const scrubbed = scrubTiptapNode(child, urls);
          if (scrubbed.changed) contentChanged = true;
          children.push(scrubbed.value);
          continue;
        }
        const scrubbed = scrubValue(child, urls);
        if (scrubbed.changed) contentChanged = true;
        children.push(scrubbed.value);
      }
      if (contentChanged) changed = true;
      out[key] = contentChanged ? children : value;
      continue;
    }

    // attrs / marks / text and anything else: plain JSON rules apply. An
    // `attrs.src` that matched would have removed the node above, so this can
    // only blank incidental references (e.g. a link mark's href).
    const scrubbed = scrubValue(value, urls);
    if (scrubbed.changed) changed = true;
    out[key] = scrubbed.value;
  }

  return changed
    ? { value: out, changed: true }
    : { value: node, changed: false };
}

/** Scrub an arbitrary nested JSON value: matching strings become `""`. */
function scrubValue(value: unknown, urls: ReadonlySet<string>): ScrubResult {
  if (typeof value === "string") {
    return isScrubbedUrl(value, urls)
      ? { value: "", changed: true }
      : { value, changed: false };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const scrubbed = scrubValue(item, urls);
      if (scrubbed.changed) changed = true;
      return scrubbed.value;
    });
    return changed ? { value: out, changed: true } : { value, changed: false };
  }

  if (isRecord(value)) {
    if (isTiptapDoc(value)) return scrubTiptapNode(value, urls);

    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const scrubbed = scrubValue(child, urls);
      if (scrubbed.changed) changed = true;
      out[key] = scrubbed.value;
    }
    return changed ? { value: out, changed: true } : { value, changed: false };
  }

  return { value, changed: false };
}

/**
 * Remove every reference to `urls` from a `customFields` blob.
 *
 * Rules:
 *  - A non-object, array, or nullish `fields` is returned untouched.
 *  - The reserved `_sp` metadata key is never inspected or modified.
 *  - A TOP-LEVEL field whose value is exactly a scrubbed URL has its KEY
 *    DELETED, so `resolveFields` falls back to the template's `defaultValue`
 *    instead of rendering an empty string.
 *  - Any nested string (list-field rows, arbitrary JSON) equal to a scrubbed
 *    URL becomes `""`.
 *  - Inside a TipTap document, a node whose `attrs.src` is a scrubbed URL is
 *    removed from its parent `content` array.
 *
 * @returns the (possibly new) blob and whether anything was removed.
 */
export function scrubUrlsFromCustomFields(
  fields: unknown,
  urls: ReadonlySet<string>,
): { value: unknown; changed: boolean } {
  if (!isRecord(fields) || urls.size === 0) {
    return { value: fields, changed: false };
  }

  let changed = false;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (key === RESERVED_METADATA_KEY) {
      out[key] = value;
      continue;
    }

    // Top-level scalar field pointing straight at a scrubbed file → drop the
    // key so the template default takes over.
    if (typeof value === "string" && isScrubbedUrl(value, urls)) {
      changed = true;
      continue;
    }

    const scrubbed = scrubValue(value, urls);
    if (scrubbed.changed) changed = true;
    out[key] = scrubbed.value;
  }

  return changed
    ? { value: out, changed: true }
    : { value: fields, changed: false };
}
