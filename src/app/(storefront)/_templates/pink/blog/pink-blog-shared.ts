/**
 * Small pure helpers shared by the pink blog index and blog post pages.
 * No fields, no DOM, no hooks — safe to import from server or client
 * components.
 */

type TiptapWalkNode = {
  type?: string;
  attrs?: { level?: number };
  content?: TiptapWalkNode[];
  text?: string;
};

function walk(node: unknown, visit: (n: TiptapWalkNode) => void) {
  if (node == null || typeof node !== "object") return;
  const n = node as TiptapWalkNode;
  visit(n);
  if (Array.isArray(n.content)) {
    for (const child of n.content) walk(child, visit);
  }
}

const WORDS_PER_MINUTE = 200;

/**
 * Reading time in whole minutes (minimum 1), computed from the real word
 * count of a Tiptap document — never a placeholder value.
 */
export function estimateReadMinutes(content: unknown): number {
  let words = 0;
  walk(content, (n) => {
    if (typeof n.text === "string" && n.text.trim()) {
      words += n.text.trim().split(/\s+/).length;
    }
  });
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Number of level-2 headings in a Tiptap document — used to decide whether
 * a post/page has enough structure to warrant an auto-built TOC. */
export function countH2Headings(content: unknown): number {
  let count = 0;
  walk(content, (n) => {
    if (n.type === "heading" && n.attrs?.level === 2) count += 1;
  });
  return count;
}

export function formatBlogDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * True when an `image`-type field carries a real owner-set value, rather than
 * empty or the field system's stock `/placeholder.svg` sentinel. Used to
 * decide when to render `PinkImageFallback` instead of the generic
 * placeholder graphic (review 2026-07-29, P2) — e.g. the author avatar
 * field, which always resolves to a string but may just be the default.
 */
// Moved to `shared/pink-image-fallback` — it now gates every domain's empty
// image, not just the blog's. Re-exported here so blog call sites are unchanged.
export { hasCustomImage } from "../shared/pink-image-fallback";
