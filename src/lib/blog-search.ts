/** Fields used for client-side blog listing search (subset of Page). */
export type BlogSearchablePage = {
  title: string;
  slug: string;
  excerpt?: string | null;
  type?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  content?: unknown;
};

function extractTiptapLikeText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node !== "object") return "";
  const o = node as Record<string, unknown>;
  const chunks: string[] = [];
  if (typeof o.text === "string" && o.text.length > 0) chunks.push(o.text);
  const content = o.content;
  if (!Array.isArray(content)) return chunks.join(" ");
  for (const child of content) {
    const t = extractTiptapLikeText(child);
    if (t) chunks.push(t);
  }
  return chunks.join(" ");
}

/** Single lowercase string for substring search; rebuild when the page list changes, not per keystroke. */
export function buildBlogSearchBlob(page: BlogSearchablePage): string {
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.length > 0) parts.push(v);
  };

  push(page.title);
  push(page.slug);
  push(page.excerpt ?? undefined);
  push(page.type);
  push(page.metaTitle ?? undefined);
  push(page.metaDescription ?? undefined);
  push(page.metaKeywords ?? undefined);

  try {
    const body = extractTiptapLikeText(page.content).trim();
    if (body) parts.push(body);
  } catch {
    // ignore malformed content
  }

  return parts.join("\n").toLowerCase();
}

/**
 * Derive a short plain-text excerpt from Tiptap JSON content. Used as a
 * fallback when a post has no author-written excerpt, so cards and post intros
 * aren't left bare. Returns "" on empty/malformed content.
 */
export function deriveExcerpt(content: unknown, maxLen = 200): string {
  try {
    const text = extractTiptapLikeText(content).replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  } catch {
    return "";
  }
}

export function blobIncludesQuery(
  blob: string,
  queryTrimmedLower: string,
): boolean {
  if (queryTrimmedLower.length === 0) return true;
  return blob.includes(queryTrimmedLower);
}
