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
