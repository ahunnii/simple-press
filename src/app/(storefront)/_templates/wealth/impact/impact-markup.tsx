import { Fragment } from "react";

import { cn } from "~/lib/utils";

import { sourceAnchorId, splitParagraphs } from "./impact-rows";

/**
 * Safe inline markup for Impact Report textareas (design.md v2 §17
 * "Footnotes"). Server-safe: no hooks, no "use client".
 *
 * Two tokens, both parsed into React nodes (NEVER HTML strings, so nothing
 * the owner types can inject markup):
 * - `**bold**` → `<strong>` (same rule as `../homepage/wealth-bold-markup`:
 *   single-line pair, non-blank inner; an unmatched `**` stays literal).
 * - `[N]` → a superscript link to source N (`#impact-source-N`), ONLY when
 *   1 ≤ N ≤ `sourceCount`; anything else (`[0]`, `[99]`, `[a]`) stays
 *   literal text. Footnotes also work inside bold runs.
 */

const BOLD_PATTERN = /\*\*([^*\n]+?)\*\*/g;
const FOOTNOTE_PATTERN = /\[(\d{1,3})\]/g;

export type ImpactTextOptions = {
  /** Number of RENDERED sources (`parseImpactSources(...).length`). 0 = no links. */
  sourceCount: number;
  /** Class on each `<strong>` run. */
  strongClassName?: string;
};

/** `[N]` → footnote nodes inside one plain/bold run. */
function renderFootnotes(
  text: string,
  sourceCount: number,
  keyPrefix: string,
): React.ReactNode[] {
  if (sourceCount < 1 || !text.includes("[")) return [text];
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let i = 0;
  for (const match of text.matchAll(FOOTNOTE_PATTERN)) {
    const n = Number(match[1]);
    if (!Number.isInteger(n) || n < 1 || n > sourceCount) continue;
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <sup key={`${keyPrefix}-fn-${i}`} className="wealth-impact-fn">
        <a href={`#${sourceAnchorId(n)}`} aria-label={`Source ${n}`}>
          {n}
        </a>
      </sup>,
    );
    cursor = start + match[0].length;
    i += 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/**
 * Renders one run of owner text with `**bold**` + `[N]` footnotes. Returns
 * the plain string when there is nothing to parse.
 */
export function renderImpactText(
  text: string,
  { sourceCount, strongClassName }: ImpactTextOptions,
): React.ReactNode {
  const hasBold = text.includes("**");
  const hasFn = sourceCount > 0 && text.includes("[");
  if (!hasBold && !hasFn) return text;

  const nodes: React.ReactNode[] = [];
  const pushPlain = (segment: string, key: string) => {
    for (const [j, node] of renderFootnotes(
      segment,
      sourceCount,
      key,
    ).entries()) {
      nodes.push(
        typeof node === "string" ? (
          <Fragment key={`${key}-${j}`}>{node}</Fragment>
        ) : (
          node
        ),
      );
    }
  };

  let cursor = 0;
  let index = 0;
  if (hasBold) {
    for (const match of text.matchAll(BOLD_PATTERN)) {
      const inner = match[1];
      if (inner === undefined || inner.trim() === "") continue;
      const start = match.index;
      if (start > cursor) pushPlain(text.slice(cursor, start), `t${index}`);
      nodes.push(
        <strong key={`b${index}`} className={strongClassName}>
          {renderFootnotes(inner, sourceCount, `b${index}`)}
        </strong>,
      );
      cursor = start + match[0].length;
      index += 1;
    }
  }
  if (cursor < text.length) pushPlain(text.slice(cursor), "tail");
  return nodes;
}

type ImpactParagraphsProps = {
  /** Raw textarea value; split on blank lines. */
  text: string;
  sourceCount: number;
  /** Class on EVERY `<p>`. */
  className?: string;
  /** Extra class on the FIRST `<p>` only (e.g. the letter's lead). */
  leadClassName?: string;
  strongClassName?: string;
};

/**
 * Paragraph-split textarea → `<p>`s with inline markup. Returns a fragment
 * (the caller owns the wrapper and any `fieldAttr`; note a paragraph-split
 * textarea must NOT carry `fieldAttr`, since the editor's live patch would
 * flatten the paragraphs). Renders nothing for blank text.
 */
export function ImpactParagraphs({
  text,
  sourceCount,
  className,
  leadClassName,
  strongClassName,
}: ImpactParagraphsProps) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={cn(className, i === 0 && leadClassName) || undefined}
        >
          {renderImpactText(p, { sourceCount, strongClassName })}
        </p>
      ))}
    </>
  );
}

export type BoldLead = { lead: string; rest: string };

/**
 * "**Title** rest of the sentence" → `{ lead: "Title", rest: "rest of the
 * sentence" }`; null when the paragraph does not START with a bold run.
 * `rest` may be "" (a bold-only paragraph) and keeps any `[N]` markup for
 * `renderImpactText`.
 */
export function splitBoldLead(paragraph: string): BoldLead | null {
  const match = /^\*\*([^*\n]+?)\*\*([\s\S]*)$/.exec(paragraph.trim());
  if (!match) return null;
  const lead = (match[1] ?? "").trim();
  if (lead === "") return null;
  return { lead, rest: (match[2] ?? "").replace(/^[\s:–—-]+/, "").trim() };
}

export type ImpactBodyBlock =
  | { kind: "p"; text: string }
  | { kind: "points"; items: (BoldLead & { text: string })[] };

/**
 * Spotlight body → blocks: plain paragraphs stay `p`; each run of
 * CONSECUTIVE bold-lead paragraphs becomes one `points` block (the 2-col
 * points grid between hairlines, design.md v2 §9).
 */
export function impactBodyBlocks(text: string): ImpactBodyBlock[] {
  const blocks: ImpactBodyBlock[] = [];
  for (const para of splitParagraphs(text)) {
    const lead = splitBoldLead(para);
    if (!lead) {
      blocks.push({ kind: "p", text: para });
      continue;
    }
    const last = blocks[blocks.length - 1];
    const item = { ...lead, text: para };
    if (last?.kind === "points") last.items.push(item);
    else blocks.push({ kind: "points", items: [item] });
  }
  return blocks;
}
