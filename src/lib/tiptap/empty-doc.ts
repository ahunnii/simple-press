/**
 * Client-safe "does this TipTap doc show anything?" check.
 *
 * Node types that carry their meaning via `attrs` rather than a nested
 * `content` array (e.g. a standalone image has no children but is obviously
 * not empty). Mirrors `LEAF_CONTENT_NODE_TYPES` / `isContentEmpty` in
 * `~/lib/template-fields.ts`.
 *
 * Kept as its own tiny module rather than importing `template-fields.ts`:
 * that module re-exports every storefront template's field registry, and
 * several templates' page components import `~/server/*` directly, so it can't
 * be pulled into the validators (which client components import) or the
 * maintenance config without risking server-only code in the client bundle.
 */
const LEAF_CONTENT_NODE_TYPES = new Set([
  "image",
  "horizontalRule",
  "hardBreak",
  "gallery",
  "embed",
  "quoteCalculator",
  "form",
]);

/** True when a TipTap doc (or node, or `null`/string) has no visible content. */
export function isEmptyDoc(content: unknown): boolean {
  if (content === null || content === undefined) {
    return true;
  }

  if (typeof content === "string") {
    return content === "";
  }

  if (Array.isArray(content)) {
    return content.every((item) => isEmptyDoc(item));
  }

  if (typeof content !== "object") {
    return true;
  }

  const node = content as { type?: unknown; text?: unknown; content?: unknown };

  if (typeof node.type === "string" && LEAF_CONTENT_NODE_TYPES.has(node.type)) {
    return false;
  }

  if (typeof node.text === "string" && node.text !== "") {
    return false;
  }

  if (!node.content) {
    return true;
  }

  return isEmptyDoc(node.content);
}
