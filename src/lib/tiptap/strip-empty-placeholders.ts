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
 * The same goes for an `image` whose `src` is still a `blob:` URL. The
 * editor inserts dropped/pasted images with a local `blob:` src and swaps in
 * the stored URL once the upload finishes (`image-view-block.tsx`). A save
 * during the upload — or after a failed one — would persist a URL that only
 * ever existed in that browser tab: the storefront drops it and the editor
 * shows a broken image on reload. Once the upload lands, the next save
 * carries the real URL.
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
 *   gets a single empty paragraph, since container nodes like `blockquote`,
 *   `tableCell`, `column` and `detailsContent` require `block+` content. An
 *   emptied inline-content node (paragraph/heading/codeBlock, or a
 *   collapsible's `detailsSummary`) just loses its `content` key — it may be
 *   empty but can never hold a paragraph. A `doc` may end up as
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

/** True for an `image` node whose src is still an in-browser `blob:` URL. */
export function isUnfinishedUploadNode(node: unknown): boolean {
  if (!isObject(node) || node.type !== "image") return false;
  const src = isObject(node.attrs) ? node.attrs.src : undefined;
  return (
    typeof src === "string" && src.trim().toLowerCase().startsWith("blob:")
  );
}

function isStrippableNode(node: unknown): boolean {
  return isEmptyPlaceholderNode(node) || isUnfinishedUploadNode(node);
}

/**
 * Inline-content containers: emptied, they stay valid with no content, and
 * refilling them with a paragraph would make them invalid. `detailsSummary`
 * (`text*`) is the collapsible's title line; `codeBlock` is listed for
 * completeness.
 */
const TEXTBLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "codeBlock",
  "detailsSummary",
]);

function stripNode<T>(node: T): T {
  if (!isObject(node) || !Array.isArray(node.content)) return node;

  let changed = false;
  const next: unknown[] = [];
  for (const child of node.content as unknown[]) {
    if (isStrippableNode(child)) {
      changed = true;
      continue;
    }
    const stripped = stripNode(child);
    if (stripped !== child) changed = true;
    next.push(stripped);
  }

  if (!changed) return node;

  if (next.length === 0 && TEXTBLOCK_TYPES.has(node.type as string)) {
    // A paragraph/heading/summary may be empty but can't hold a block — drop the key.
    const rest: JsonNode = { ...node };
    delete rest.content;
    return rest as T;
  }
  const content =
    next.length === 0 && node.type !== "doc" ? [{ type: "paragraph" }] : next;
  return { ...node, content } as T;
}

/**
 * Remove every unfilled embed/gallery/quoteCalculator/form placeholder, and
 * every image still pointing at a `blob:` upload, from a TipTap JSON doc. See
 * the module comment for the full contract.
 */
export function stripEmptyPlaceholderNodes<T>(doc: T): T {
  return stripNode(doc);
}

function isTiptapDoc(value: unknown): value is JsonNode {
  return isObject(value) && value.type === "doc";
}

/**
 * `stripEmptyPlaceholderNodes` for a *container* of rich-text values rather
 * than a single doc — a template `customFields` / `previewCustomFields` map,
 * a service's `customFields`, or a product's `additionalFields` blob.
 *
 * Rich text in those maps is stored as a TipTap doc object (what the editors
 * emit with `output="json"`), but older/imported values can be a
 * string-encoded doc (`parseTemplateRichtext` accepts both). So:
 *
 * - A `{ type: "doc" }` object is stripped via `stripEmptyPlaceholderNodes`.
 * - A string that parses to a `{ type: "doc" }` object is stripped too, and
 *   re-serialized ONLY when something was removed — otherwise the original
 *   string is returned untouched.
 * - Arrays (list fields' rows) and other plain objects (the map itself, list
 *   row objects) are walked, so a doc in any value or list cell is reached.
 * - Every other value (plain text, numbers, booleans, null, iframe-field JSON
 *   strings, non-doc JSON strings) is returned as-is.
 *
 * Identity contract: the input (and every unchanged sub-value) is returned BY
 * REFERENCE when nothing was removed.
 */
export function stripEmptyPlaceholdersInFields<T>(value: T): T {
  return stripDeep(value);
}

function stripDeep<T>(value: T): T {
  if (typeof value === "string") return stripDocString(value) as T;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item: unknown) => {
      const stripped = stripDeep(item);
      if (stripped !== item) changed = true;
      return stripped;
    });
    return (changed ? next : value) as T;
  }

  if (!isObject(value)) return value;

  if (isTiptapDoc(value)) return stripEmptyPlaceholderNodes(value);

  let changed = false;
  const next: JsonNode = {};
  for (const [key, child] of Object.entries(value)) {
    const stripped = stripDeep(child);
    if (stripped !== child) changed = true;
    next[key] = stripped;
  }
  return (changed ? next : value) as T;
}

function stripDocString(value: string): string {
  // Cheap pre-filter before paying for JSON.parse: a string-encoded doc is
  // always a JSON object, and must mention a placeholder node type (or a
  // `blob:` URL) to need stripping at all.
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return value;
  if (
    !trimmed.includes('"blob:') &&
    !Object.keys(PLACEHOLDER_NODE_REQUIRED_ATTR).some((type) =>
      trimmed.includes(`"${type}"`),
    )
  ) {
    return value;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return value;
  }
  if (!isTiptapDoc(parsed)) return value;

  const stripped = stripEmptyPlaceholderNodes(parsed);
  return stripped === parsed ? value : JSON.stringify(stripped);
}
