import type { ReactNode } from "react";
import { Fragment } from "react";

/**
 * Product descriptions are stored as a plain string, but some stores' rows
 * were imported with a little HTML (`<h2>`, `<em>`) and literal `\n`
 * escape sequences instead of real line breaks. These helpers render that
 * safely: a small allowlist of formatting tags becomes React elements, every
 * other tag is dropped (its text kept), and attributes are never carried
 * over — so no `dangerouslySetInnerHTML`, no links, no scripts.
 */

type Node = string | { tag: string; children: Node[] };

/** Source tag → rendered tag. Headings sit one level below the page's own. */
const TAG_MAP: Record<string, string> = {
  h1: "h3",
  h2: "h3",
  h3: "h3",
  h4: "h4",
  h5: "h4",
  h6: "h4",
  p: "p",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  ul: "ul",
  ol: "ol",
  li: "li",
};

const BLOCK_TAGS = new Set(["h3", "h4", "p", "ul", "ol"]);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Turns literal `\n` / `\r\n` escape sequences and CRLFs into real newlines. */
function normalizeNewlines(raw: string): string {
  return raw.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n?/g, "\n");
}

function parse(raw: string): Node[] {
  const root: Node[] = [];
  const stack: { tag: string; children: Node[] }[] = [];
  const current = () => stack.at(-1)?.children ?? root;
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;

  const source = normalizeNewlines(raw);
  let last = 0;
  for (const match of source.matchAll(tagPattern)) {
    const text = source.slice(last, match.index);
    if (text) current().push(decodeEntities(text));
    last = match.index + match[0].length;

    const [, closing, name = "", selfClosing] = match;
    const sourceTag = name.toLowerCase();
    if (sourceTag === "br") {
      current().push("\n");
      continue;
    }
    const tag = TAG_MAP[sourceTag];
    if (!tag || selfClosing) continue;

    if (!closing) {
      const node = { tag, children: [] as Node[] };
      current().push(node);
      stack.push(node);
      continue;
    }
    // Close the nearest matching open tag; ignore stray closers.
    const index = stack.map((n) => n.tag).lastIndexOf(tag);
    if (index !== -1) stack.length = index;
  }
  const tail = source.slice(last);
  if (tail) root.push(decodeEntities(tail));
  return root;
}

function isBlock(node: Node): boolean {
  return typeof node !== "string" && BLOCK_TAGS.has(node.tag);
}

/** Inline content: single newlines become `<br>`. */
function renderInline(nodes: Node[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (typeof node === "string") {
      const lines = node.split("\n");
      return (
        <Fragment key={key}>
          {lines.map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </Fragment>
      );
    }
    const Tag = node.tag as "strong";
    return <Tag key={key}>{renderInline(node.children, key)}</Tag>;
  });
}

function trimInline(nodes: Node[]): Node[] {
  const out = [...nodes];
  while (typeof out[0] === "string" && !out[0].trim()) out.shift();
  while (typeof out.at(-1) === "string" && !(out.at(-1) as string).trim())
    out.pop();
  if (typeof out[0] === "string") out[0] = out[0].replace(/^\s+/, "");
  const lastIndex = out.length - 1;
  if (typeof out[lastIndex] === "string")
    out[lastIndex] = out[lastIndex].replace(/\s+$/, "");
  return out;
}

function renderBlock(node: Node & object, key: string): ReactNode {
  const Tag = node.tag as "p";
  if (node.tag === "ul" || node.tag === "ol") {
    const items = node.children.filter(
      (child): child is Node & object => typeof child !== "string",
    );
    return (
      <Tag key={key}>
        {items.map((item, i) => (
          <li key={i}>
            {renderInline(trimInline(item.children), `${key}-${i}`)}
          </li>
        ))}
      </Tag>
    );
  }
  return <Tag key={key}>{renderInline(trimInline(node.children), key)}</Tag>;
}

/**
 * Renders a product description as formatted React nodes: allowlisted tags
 * become headings/paragraphs/lists/emphasis, loose text is split into
 * paragraphs on blank lines, and single line breaks become `<br>`.
 */
export function renderProductDescription(
  raw: string | null | undefined,
): ReactNode[] {
  if (!raw?.trim()) return [];
  const out: ReactNode[] = [];
  let inline: Node[] = [];

  const flushInline = () => {
    // Loose text between blocks: split into paragraphs on blank lines.
    const paragraphs: Node[][] = [[]];
    for (const node of inline) {
      if (typeof node !== "string") {
        paragraphs.at(-1)!.push(node);
        continue;
      }
      node.split(/\n{2,}/).forEach((part, i) => {
        if (i > 0) paragraphs.push([]);
        paragraphs.at(-1)!.push(part);
      });
    }
    for (const paragraph of paragraphs) {
      const trimmed = trimInline(paragraph);
      if (trimmed.length === 0) continue;
      const key = `p-${out.length}`;
      out.push(<p key={key}>{renderInline(trimmed, key)}</p>);
    }
    inline = [];
  };

  for (const node of parse(raw)) {
    if (isBlock(node)) {
      flushInline();
      out.push(renderBlock(node as Node & object, `b-${out.length}`));
    } else {
      inline.push(node);
    }
  }
  flushInline();
  return out;
}

/** The description as a single line of plain text (tags stripped), for blurbs. */
export function productDescriptionToPlainText(
  raw: string | null | undefined,
): string {
  if (!raw) return "";
  return decodeEntities(
    normalizeNewlines(raw)
      .replace(/<\/(h[1-6]|p|li)>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}
