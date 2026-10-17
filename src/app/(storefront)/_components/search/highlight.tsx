import { Fragment } from "react";

/**
 * Query-term highlighting shared by the header dialog and the /search page.
 *
 * Escape-safe by construction: the text is split into plain strings and
 * rendered as React text nodes (never HTML), and every term is regex-escaped.
 * Every query word is highlighted, case-insensitively. Each word also matches
 * its light plural-trimmed stem (same rule as `trimPlural` in
 * `~/server/search/site-search`), so "dresses" highlights "Dress" — the
 * server matched on the stem, so the title may only contain that.
 *
 * Pure module (no hooks) — safe in server and client components.
 */

const MAX_TERMS = 5;

function trimPlural(word: string): string {
  if (/(ses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lower-cased words + stems to highlight, longest first. */
export function highlightTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_TERMS);
  const terms = new Set<string>();
  for (const word of words) {
    terms.add(word);
    const stem = trimPlural(word);
    if (stem.length >= 2) terms.add(stem);
  }
  // Longest first so the alternation prefers "dresses" over "dress".
  return [...terms].sort((a, b) => b.length - a.length);
}

export type HighlightPart = { text: string; match: boolean };

/** Split `text` into matched / unmatched runs for `query`. */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const terms = highlightTerms(query);
  if (!text || terms.length === 0) return [{ text, match: false }];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts: HighlightPart[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index;
    if (start > last)
      parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: m[0], match: true });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}

/** `text` with every query word wrapped in `<mark class="sp-search-mark">`. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="sp-search-mark">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
