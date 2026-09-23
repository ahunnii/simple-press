import type { JSONContent } from "@tiptap/core";
import type { NodeType, Schema } from "@tiptap/pm/model";

import { safeHref } from "~/lib/safe-href";

/**
 * Schema-derived, isomorphic sanitizer for stored TipTap JSON.
 *
 * Why it exists: `TiptapRenderer` used to hand stored JSON straight to
 * `generateHTML` and clean the *output* with `sanitizeGeneratedHtml`, which
 * returns its input untouched when `typeof window === "undefined"`. Because
 * `@tiptap/html`'s exports map resolves to `dist/server/index.js` under SSR,
 * the server-rendered HTML skipped the sanitizer entirely and only the client
 * re-render was cleaned — and any difference between the two is a hydration
 * mismatch. What made that safe in practice was `generateHTML` being
 * schema-bound plus the Link extension's own protocol allowlist: a
 * third-party guarantee, in a security-critical position.
 *
 * This runs BEFORE `generateHTML` on both sides, so server and client start
 * from byte-identical JSON. It is pure — no DOM, no `server-only`, no
 * `~/server/*` — so it is importable from the client renderer, the WordPress
 * exporter, and a node test alike.
 *
 * The allowlist is DERIVED, never hand-written: the caller passes the
 * `Schema` built by `getSchema(extensions)` from the exact extension list it
 * will render with, so nodes, marks and their attrs come from the extensions
 * themselves. Anything the renderer's schema does not know about — marks and
 * attrs the admin editor registers but the storefront does not (Color,
 * CodeBlockLowlight), or anything hand-edited into the JSON — is dropped.
 */

/** Attr names refused regardless of what the schema declares. */
const REFUSED_ATTRS = new Set(["style", "class"]);

/** Any `on*` attr is an inline event handler. Defense in depth: no current extension declares one. */
const EVENT_HANDLER_ATTR_RE = /^on/i;

/**
 * Inline images the admin editor can produce. `minimal-tiptap`'s FileHandler
 * accepts `image/*` and inserts the file as a `readAsDataURL` result
 * (`fileToBase64`), so real stored docs do contain base64 image nodes.
 *
 * `image/svg+xml` is deliberately NOT on this list: an SVG is a document, and
 * keeping it out costs an owner nothing (an uploaded `.svg` still renders
 * through the normal S3 URL path) while removing a whole class of parser
 * surprises from a value that is otherwise opaque bytes.
 */
const DATA_IMAGE_SRC_RE =
  /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,[A-Za-z0-9+/=\s]*$/;

/** Schemes an `<img src>` may carry. Relative (scheme-less) is also allowed. */
const IMAGE_SCHEMES = new Set(["http", "https"]);

/** Schemes a `<video src>` may carry. Relative (scheme-less) is also allowed. */
const VIDEO_SCHEMES = new Set(["http", "https"]);

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

/** `target` values a link mark may keep. Anything else is dropped (the attr, not the mark). */
const LINK_TARGETS = new Set(["_blank", "_self"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isPrimitive(value: unknown): boolean {
  if (value === null) return true;
  const kind = typeof value;
  return kind === "string" || kind === "number" || kind === "boolean";
}

/**
 * Attr values must be primitives, or a flat array of primitives.
 *
 * The array case is not decoration: ProseMirror's table nodes store
 * `colwidth` as `number[]`, so a primitives-only rule would silently strip
 * every resized column. Nothing deeper than one level is accepted, so an
 * attacker still cannot smuggle an object graph through an attr.
 */
function isAllowedAttrValue(value: unknown): boolean {
  if (isPrimitive(value)) return true;
  return Array.isArray(value) && value.every(isPrimitive);
}

/**
 * Keeps only attrs the schema declares for this node/mark, then applies the
 * unconditional refusals on top.
 */
function sanitizeAttrs(
  raw: unknown,
  declared: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isPlainObject(raw) || declared == null) return out;

  for (const [key, value] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(declared, key)) continue;
    if (REFUSED_ATTRS.has(key) || EVENT_HANDLER_ATTR_RE.test(key)) continue;
    if (!isAllowedAttrValue(value)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Validates an `image` node's `src`: relative, `http(s)`, or an inline base64
 * image of a known raster type. Everything else (`data:text/html`,
 * `javascript:`, `blob:`, `file:`) drops the whole node — an image with no
 * usable source has nothing to render anyway.
 */
export function isSafeImageSrc(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;

  if (/^data:/i.test(trimmed)) return DATA_IMAGE_SRC_RE.test(trimmed);

  const safe = safeHref(trimmed);
  if (safe === null) return false;

  const scheme = SCHEME_RE.exec(safe)?.[1];
  return scheme === undefined || IMAGE_SCHEMES.has(scheme.toLowerCase());
}

/**
 * Validates a `video` node's `src`: relative or `http(s)` only. Unlike
 * images, there is no inline base64 case — uploads always go through
 * `/api/upload` and come back as a storage URL, never a data URI — so
 * `data:`, `blob:`, `javascript:` and `file:` all drop the whole node.
 */
export function isSafeVideoSrc(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;

  const safe = safeHref(trimmed);
  if (safe === null) return false;

  const scheme = SCHEME_RE.exec(safe)?.[1];
  return scheme === undefined || VIDEO_SCHEMES.has(scheme.toLowerCase());
}

/** Sanitizes a node's `marks` array. Unknown marks are dropped; the text they wrapped is kept. */
function sanitizeMarks(raw: unknown, schema: Schema): JSONContent["marks"] {
  if (!Array.isArray(raw)) return [];
  const out: NonNullable<JSONContent["marks"]> = [];

  for (const rawMark of raw) {
    if (!isPlainObject(rawMark)) continue;
    const type = rawMark.type;
    if (typeof type !== "string") continue;

    const markType = schema.marks[type];
    if (!markType) continue;

    const attrs = sanitizeAttrs(
      rawMark.attrs,
      markType.spec.attrs as Record<string, unknown> | undefined,
    );

    if (type === "link") {
      const href = safeHref(attrs.href);
      // A link whose destination is refused loses the MARK, not the text —
      // the sentence keeps reading, it just stops being clickable.
      if (href === null) continue;
      attrs.href = href;

      if (typeof attrs.target === "string" && !LINK_TARGETS.has(attrs.target)) {
        delete attrs.target;
      }
      // The renderer stamps `rel="noopener noreferrer nofollow"` via the Link
      // extension's `HTMLAttributes`, so a stored `rel` can only weaken it.
      delete attrs.rel;
    }

    out.push(isPlainObject(rawMark.attrs) ? { type, attrs } : { type });
  }

  return out;
}

/**
 * True when `parentType`'s content expression will accept `childType` at all.
 *
 * Used ONLY to filter nodes hoisted out of an unknown wrapper. Ordinary
 * children are left alone: they were already valid before this pass ran, and
 * re-deciding their validity here would be a behaviour change dressed up as a
 * security fix. `matchType` is checked against the parent's *initial* match,
 * which is an approximation of the full sequential expression — deliberately,
 * because the alternative is reimplementing ProseMirror's content matcher for
 * a case that only arises when a doc already contains something bogus.
 */
function parentAccepts(
  parentType: NodeType,
  childType: NodeType | undefined,
): boolean {
  if (!childType) return false;
  return parentType.contentMatch.matchType(childType) !== null;
}

function sanitizeChildren(
  raw: unknown,
  parentType: NodeType,
  schema: Schema,
): JSONContent[] {
  if (!Array.isArray(raw)) return [];
  const out: JSONContent[] = [];
  for (const child of raw) {
    out.push(...sanitizeNode(child, parentType, schema));
  }
  return out;
}

/**
 * Returns 0, 1, or — when an unknown wrapper is hoisted away — several nodes.
 */
function sanitizeNode(
  raw: unknown,
  parentType: NodeType,
  schema: Schema,
): JSONContent[] {
  if (!isPlainObject(raw)) return [];

  const type = raw.type;
  if (typeof type !== "string" || type === "") return [];

  const nodeType = schema.nodes[type];

  if (!nodeType) {
    // Unknown node (`script`, `iframe`, a mark/node from an extension the
    // renderer doesn't register): drop the wrapper, keep the text inside it
    // by hoisting the children into this node's parent — but only those the
    // parent will actually accept, so a hoist can't leave an inline node
    // sitting directly under `doc`.
    return sanitizeChildren(raw.content, parentType, schema).filter((child) =>
      parentAccepts(
        parentType,
        typeof child.type === "string" ? schema.nodes[child.type] : undefined,
      ),
    );
  }

  if (type === "text") {
    const text = raw.text;
    // ProseMirror has no concept of an empty text node.
    if (typeof text !== "string" || text === "") return [];
    const node: JSONContent = { type, text };
    attachAttrsAndMarks(node, raw, nodeType, schema);
    return [node];
  }

  if (type === "image" && !isSafeImageSrc(readAttr(raw, "src"))) return [];
  if (type === "video" && !isSafeVideoSrc(readAttr(raw, "src"))) return [];

  const node: JSONContent = { type };
  attachAttrsAndMarks(node, raw, nodeType, schema);

  const attrs = node.attrs;
  if (type === "image" && attrs) {
    // `alt`/`title` are rendered as text; a non-string there is a sign the
    // JSON was hand-edited, and the schema's type-free attr declaration
    // won't catch it.
    for (const key of ["alt", "title"] as const) {
      const value: unknown = attrs[key];
      if (value != null && typeof value !== "string") delete attrs[key];
    }
  }

  if (Array.isArray(raw.content)) {
    node.content = sanitizeChildren(raw.content, nodeType, schema);
  }

  return [node];
}

function readAttr(raw: Record<string, unknown>, key: string): unknown {
  return isPlainObject(raw.attrs) ? raw.attrs[key] : undefined;
}

/**
 * Mirrors the input's key presence: a node that stored `attrs`/`marks` keeps
 * them (sanitized, possibly empty), a node that didn't gains nothing. That is
 * what lets a clean document round-trip deep-equal.
 */
function attachAttrsAndMarks(
  node: JSONContent,
  raw: Record<string, unknown>,
  nodeType: NodeType,
  schema: Schema,
): void {
  if (isPlainObject(raw.attrs)) {
    node.attrs = sanitizeAttrs(
      raw.attrs,
      nodeType.spec.attrs as Record<string, unknown> | undefined,
    );
  }
  if (Array.isArray(raw.marks)) {
    node.marks = sanitizeMarks(raw.marks, schema);
  }
}

/**
 * Sanitizes a stored TipTap document against `schema`.
 *
 * Returns a structurally NEW document (the input is never mutated — the same
 * JSON object is reused across renders), or `null` when the value is not a
 * TipTap doc envelope.
 */
export function sanitizeTiptapDoc(
  doc: unknown,
  schema: Schema,
): JSONContent | null {
  if (!isPlainObject(doc)) return null;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return null;

  return {
    type: "doc",
    content: sanitizeChildren(doc.content, schema.topNodeType, schema),
  };
}
