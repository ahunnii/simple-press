import { Fragment } from "react";

/**
 * Tiny, safe `**bold**` parser for owner copy.
 *
 * Splits on `**…**` pairs and returns React nodes: plain runs as text, bold
 * runs as `<strong>`. It never produces HTML strings, so nothing the owner
 * types can inject markup. An unmatched `**` (or an empty `****`) is left as
 * literal text.
 */
const BOLD_PATTERN = /\*\*([^*\n]+?)\*\*/g;

export function renderBoldMarkup(
  text: string,
  strongClassName?: string,
): React.ReactNode {
  if (!text.includes("**")) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  for (const match of text.matchAll(BOLD_PATTERN)) {
    const start = match.index;
    const inner = match[1];
    if (inner === undefined || inner.trim() === "") continue;
    if (start > cursor) {
      nodes.push(
        <Fragment key={`t-${index}`}>{text.slice(cursor, start)}</Fragment>,
      );
    }
    nodes.push(
      <strong key={`b-${index}`} className={strongClassName}>
        {inner}
      </strong>,
    );
    cursor = start + match[0].length;
    index += 1;
  }
  if (cursor < text.length) {
    nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }
  return nodes;
}
