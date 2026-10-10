/**
 * Pure helper that removes *unfilled placeholder* nodes from stored TipTap
 * JSON before it is persisted.
 *
 * Several "Insert elements" nodes are inserted into the editor EMPTY and then
 * filled in through an inline panel/picker in their node view:
 *
 * | node type         | identifying attr | inserted as        |
 * | ----------------- | ---------------- | ------------------ |
 * | `embed`           | `src`            | `src: null`        |
 * | `gallery`         | `galleryId`      | `galleryId: null`  |
 * | `quoteCalculator` | `calculatorId`   | `calculatorId: null` |
 * | `form`            | `formId`         | `formId: null`     |
 *
 * Until the owner clicks the panel's Save, the node sits in the editor's doc
 * with no identifying attr — and any save that happens in that window (the
 * visual editor's debounced draft autosave, or the Site Admin page editor's
 * Save button) would persist it. The storefront renders such a node as an
 * empty `<div>`, and on reload the editor shows a fresh blank panel the owner
 * never asked for.
 *
 * This runs at the PERSISTENCE boundary (the server's page/draft writes), not
 * in the editor's `onChange`: the editor must keep the empty node in memory
 * while the panel is open, and `useMinimalTiptapEditor` re-applies any `value`
 * that differs from what it last emitted — stripping there would make the
 * panel vanish mid-edit.
 *
 * Contract:
 * - Returns the input BY REFERENCE when nothing was removed (cheap no-op and
 *   identity-stable for callers that compare references).
 * - Non-object input (null, HTML strings, numbers) is returned untouched.
 * - Walks `content` arrays recursively, so placeholders nested in
 *   blockquotes / table cells are removed too.
 * - A non-`doc` container whose content becomes empty because of the removal
 *   gets a single empty paragraph, since container nodes like `blockquote`
 *   and `tableCell` require `block+` content. A `doc` may end up as
 *   `{ type: "doc", content: [] }`, the app's canonical empty doc.
 */

/** Node type → the attr whose absence marks the node as an unfilled placeholder. */
export const PLACEHOLDER_NODE_REQUIRED_ATTR: Readonly<Record<string, string>> =
  {
    embed: "src",
    gallery: "galleryId",
    quoteCalculator: "calculatorId",
    form: "formId",
  };

type JsonNode = Record<string, unknown>;

function isObject(value: unknown): value is JsonNode {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** True for a placeholder node whose identifying attr is missing/blank. */
export function isEmptyPlaceholderNode(node: unknown): boolean {
  if (!isObject(node) || typeof node.type !== "string") return false;
  if (
    !Object.prototype.hasOwnProperty.call(
      PLACEHOLDER_NODE_REQUIRED_ATTR,
      node.type,
    )
  ) {
    return false;
  }
  const attrName = PLACEHOLDER_NODE_REQUIRED_ATTR[node.type]!;
  const attrs = isObject(node.attrs) ? node.attrs : {};
  const value = attrs[attrName];
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return false;
  return true;
}

function stripNode<T>(node: T): T {
  if (!isObject(node) || !Array.isArray(node.content)) return node;

  let changed = false;
  const next: unknown[] = [];
  for (const child of node.content as unknown[]) {
    if (isEmptyPlaceholderNode(child)) {
      changed = true;
      continue;
    }
    const stripped = stripNode(child);
    if (stripped !== child) changed = true;
    next.push(stripped);
  }

  if (!changed) return node;

  const content =
    next.length === 0 && node.type !== "doc" ? [{ type: "paragraph" }] : next;
  return { ...node, content } as T;
}

/**
 * Remove every unfilled embed/gallery/quoteCalculator/form placeholder from a
 * TipTap JSON doc. See the module comment for the full contract.
 */
export function stripEmptyPlaceholderNodes<T>(doc: T): T {
  return stripNode(doc);
}
