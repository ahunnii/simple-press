/**
 * Blank lines for the storefront.
 *
 * The editor shows an empty paragraph (or a paragraph ending in Shift+Enter)
 * as a full line because ProseMirror appends a `<br class="ProseMirror-
 * trailingBreak">` to it. `generateHTML` has no such step: an empty paragraph
 * serializes to `<p></p>`, which is zero tall, and a trailing `hardBreak`
 * renders a single `<br>` that browsers collapse. `preserveBlankLines` closes
 * that gap on the JSON, before rendering.
 *
 * Pure and dependency-free on purpose: it runs in the storefront bundle, so it
 * must not import any editor code. Input is never mutated.
 */

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: unknown[];
  text?: string;
};

function isNodeObject(value: unknown): value is JsonNode {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * A paragraph with no content, or only whitespace-only text. A paragraph that
 * holds anything else — including a `hardBreak` — is not empty.
 */
export function isEmptyParagraph(node: unknown): boolean {
  if (!isNodeObject(node) || node.type !== "paragraph") return false;
  if (!Array.isArray(node.content)) return true;
  return node.content.every(
    (child) =>
      isNodeObject(child) &&
      child.type === "text" &&
      (typeof child.text !== "string" || child.text.trim() === ""),
  );
}

function hasParagraphChild(content: JsonNode[]): boolean {
  return content.some(
    (child) => isNodeObject(child) && child.type === "paragraph",
  );
}

/** A content array whose children are blocks (it holds at least one paragraph). */
function padBlockChildren(content: JsonNode[]): JsonNode[] {
  let start = 0;
  let end = content.length;
  while (start < end && isEmptyParagraph(content[start])) start++;
  while (end > start && isEmptyParagraph(content[end - 1])) end--;

  // Never reduce a container to nothing: an all-empty container keeps one
  // paragraph exactly as it was.
  if (start === end) return content.length > 0 ? [content[0]!] : content;

  return content.slice(start, end).map((child) => {
    if (isEmptyParagraph(child)) {
      // Interior blank line: `<p><br></p>` is one line tall.
      return { ...child, content: [{ type: "hardBreak" }] };
    }
    return child;
  });
}

/** Mirrors ProseMirror's trailing break so a final Shift+Enter line shows. */
function padTrailingHardBreak(node: JsonNode): JsonNode {
  const content = node.content;
  if (
    node.type !== "paragraph" ||
    !Array.isArray(content) ||
    content.length === 0
  ) {
    return node;
  }
  const last = content[content.length - 1];
  if (isNodeObject(last) && last.type === "hardBreak") {
    return { ...node, content: [...content, { type: "hardBreak" }] };
  }
  return node;
}

function processNode(node: JsonNode): JsonNode {
  if (!Array.isArray(node.content)) return node;

  const wasEmptyParagraph = isEmptyParagraph(node);
  const children = node.content.map((child) =>
    isNodeObject(child) && !isEmptyParagraph(child)
      ? processNode(child)
      : child,
  );

  if (wasEmptyParagraph) return { ...node, content: children };

  const padded = hasParagraphChild(children)
    ? padBlockChildren(children)
    : children;
  return padTrailingHardBreak({ ...node, content: padded });
}

/**
 * Makes blank lines survive rendering: interior empty paragraphs become
 * `[hardBreak]`, leading/trailing empty paragraphs of any block container are
 * dropped (TipTap's TrailingNode adds an invisible one after headings, lists
 * and rows, which must not become new bottom space), and a paragraph ending in
 * a `hardBreak` gets one more so the last line is visible.
 *
 * Anything that is not a `doc` node with a content array is returned as-is.
 */
export function preserveBlankLines<T>(doc: T): T {
  if (!isNodeObject(doc) || doc.type !== "doc" || !Array.isArray(doc.content)) {
    return doc;
  }
  return processNode(doc) as T;
}
