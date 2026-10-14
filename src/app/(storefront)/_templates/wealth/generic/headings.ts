/**
 * Heading helpers for the generic page's "On this page" list. Pure and
 * dependency-free so the server page (which renders the list) and the client
 * anchor component (which stamps the ids onto the rendered `h2`s) agree.
 */

export type WealthH2 = { id: string; text: string };

/** Minimum h2 count before the page shows an "On this page" list. */
export const WEALTH_TOC_MIN_H2 = 4;

const RESERVED_IDS = new Set([
  "page-title",
  "page-cta-heading",
  "main-content",
]);

type Node = {
  type?: string;
  text?: string;
  attrs?: { level?: number };
  content?: unknown;
};

function nodeText(node: unknown): string {
  if (node == null || typeof node !== "object") return "";
  const n = node as Node;
  if (typeof n.text === "string") return n.text;
  return Array.isArray(n.content) ? n.content.map(nodeText).join("") : "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Every h2 in the Tiptap JSON, in document order, with unique anchor ids. */
export function extractH2Headings(content: unknown): WealthH2[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (node == null || typeof node !== "object") return;
    const n = node as Node;
    if (n.type === "heading" && n.attrs?.level === 2) {
      const text = nodeText(n).trim();
      if (text) found.push(text);
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(content);

  const seen = new Map<string, number>();
  return found.map((text) => {
    let base = slugify(text) || "section";
    if (RESERVED_IDS.has(base)) base = `${base}-section`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { id: count === 0 ? base : `${base}-${count + 1}`, text };
  });
}

const norm = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Pairs the rendered `h2` elements (their text, in DOM order) with the ids
 * computed from the JSON. Matching by text, not by position, keeps the ids
 * on the right headings when the DOM holds an h2 the JSON walk skipped (an
 * empty heading) or lacks one it listed (a node the renderer's sanitizer
 * dropped). Returns one entry per DOM heading: its id, or null.
 */
export function assignHeadingIds(
  domTexts: string[],
  headings: WealthH2[],
): (string | null)[] {
  let next = 0;
  return domTexts.map((raw) => {
    const text = norm(raw);
    if (text === "") return null;
    for (let j = next; j < headings.length; j++) {
      const h = headings[j];
      if (h && norm(h.text) === text) {
        next = j + 1;
        return h.id;
      }
    }
    return null;
  });
}
