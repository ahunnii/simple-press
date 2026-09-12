import { deriveExcerpt } from "~/lib/blog-search";

const WORDS_PER_MINUTE = 200;

/**
 * Rough reading time from a post's Tiptap JSON body, rounded to the nearest
 * minute (minimum 1). Reuses `deriveExcerpt`'s Tiptap-text-walker with an
 * effectively unbounded length instead of re-implementing the walk here.
 */
export function estimateReadingMinutes(content: unknown): number {
  const text = deriveExcerpt(content, Number.MAX_SAFE_INTEGER);
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
