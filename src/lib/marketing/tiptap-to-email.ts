import type { JSONContent } from "@tiptap/core";

/**
 * Converts a tiptap document into email-safe HTML (inline styles only: no
 * classes, flex or grid) plus a plain-text alternative.
 *
 * Pure and React-free so it runs on the server (the frozen campaign render)
 * and in the composer (live preview + warnings). It walks the JSON over an
 * allowlist; anything else is dropped (with a warning) rather than passed
 * through, and every text and attribute value is escaped, so the output is
 * safe to inject with `dangerouslySetInnerHTML`.
 *
 * Allowlist:
 *  - nodes: doc, paragraph, heading (1-3; deeper levels clamp to 3), text,
 *    hardBreak, bulletList, orderedList, listItem, blockquote,
 *    horizontalRule, image
 *  - marks: bold, italic, underline, strike, link, textStyle (color only),
 *    highlight, subscript, superscript
 *  - attrs: textAlign on paragraph/heading, image src/alt/width/size/align
 *
 * Links: absolute http(s) and mailto: pass through. A site-relative link
 * (`/contact`, as the page picker inserts) is resolved against
 * `options.baseUrl` (the store's public URL) into an absolute link; with no
 * base URL it is dropped. Everything else (javascript:, data:, `//host`) is
 * dropped.
 */
export type TiptapEmailOptions = {
  /** The store's public origin, e.g. `https://shop.example.com`. */
  baseUrl?: string | null;
};

export type TiptapEmailResult = {
  html: string;
  text: string;
  warnings: string[];
};

/** Widest an image may render (matches the email layout's content width). */
export const EMAIL_IMAGE_MAX_WIDTH = 600;

const MAX_DEPTH = 24;

const FONT_SIZE = "16px";
const LINE_HEIGHT = "26px";
const TEXT_COLOR = "#333333";
const LINK_COLOR = "#2563eb";

// ─── Escaping & validation ───────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+|1\.0+)\s*)?\)$/i;

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** A CSS color the email may carry (#hex or rgb()/rgba()), else `null`. */
function safeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return HEX_COLOR.test(v) || RGB_COLOR.test(v) ? v : null;
}

/** The http(s) origin of a base URL, else `null`. */
function baseOrigin(baseUrl: string | null | undefined): URL | null {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") return null;
  try {
    const url = new URL(baseUrl.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * An absolute http(s) or mailto URL, else `null`. A site-relative path
 * (`/contact`, not `//host` or `/\host`) is resolved against `baseUrl`.
 */
function safeHref(value: unknown, baseUrl?: string | null): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v === "" || hasControlChars(v)) return null;
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  if (v.startsWith("/")) {
    if (v.startsWith("//") || v.startsWith("/\\")) return null;
    const base = baseOrigin(baseUrl);
    if (!base) return null;
    try {
      const resolved = new URL(v, base);
      return resolved.origin === base.origin ? resolved.href : null;
    } catch {
      return null;
    }
  }
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}

/** An absolute https URL, else `null` (email clients block everything else). */
function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v === "" || hasControlChars(v)) return null;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

type Align = "left" | "center" | "right" | "justify";

function safeAlign(value: unknown): Align | null {
  return value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
    ? value
    : null;
}

const IMAGE_SIZE_PERCENT: Record<string, number> = {
  small: 25,
  medium: 50,
  large: 75,
  full: 100,
};

const NODE_LABELS: Record<string, string> = {
  gallery: "Galleries",
  embed: "Embeds",
  video: "Videos",
  form: "Forms",
  quoteCalculator: "Quote calculators",
  table: "Tables",
  columns: "Columns",
  details: "Collapsible sections",
  codeBlock: "Code blocks",
};

// ─── Walker ──────────────────────────────────────────────────────────────

type Ctx = { warnings: Set<string>; baseUrl: string | null };

function warn(ctx: Ctx, message: string) {
  ctx.warnings.add(message);
}

function nodeContent(node: JSONContent): JSONContent[] {
  return Array.isArray(node.content)
    ? node.content.filter(
        (c): c is JSONContent => typeof c === "object" && c !== null,
      )
    : [];
}

function attrOf(node: JSONContent): Record<string, unknown> {
  return node.attrs && typeof node.attrs === "object" ? node.attrs : {};
}

/** Every piece of text under a node (no marks), one entry per text block. */
function collectTextBlocks(node: JSONContent, depth = 0): string[] {
  if (depth > MAX_DEPTH) return [];
  const children = nodeContent(node);
  if (children.some((c) => c.type === "text" || c.type === "hardBreak")) {
    const line = children
      .map((c) =>
        c.type === "text" ? (c.text ?? "") : c.type === "hardBreak" ? "\n" : "",
      )
      .join("");
    return line.trim() === "" ? [] : [line];
  }
  return children.flatMap((c) => collectTextBlocks(c, depth + 1));
}

const baseText = `font-size:${FONT_SIZE};line-height:${LINE_HEIGHT};color:${TEXT_COLOR}`;

function blockStyle(align: Align | null, extra: string): string {
  return `${extra}${align && align !== "left" ? `;text-align:${align}` : ""}`;
}

function unknownMarkWarning(ctx: Ctx, type: string) {
  warn(
    ctx,
    `The "${type}" text style isn't supported in email and was removed.`,
  );
}

type Rendered = { html: string; text: string };

function renderMarks(
  node: JSONContent,
  ctx: Ctx,
): { open: string; close: string; href: string | null } {
  let open = "";
  let close = "";
  let href: string | null = null;
  let link = "";
  let linkClose = "";
  const marks = Array.isArray(node.marks) ? node.marks : [];
  for (const mark of marks) {
    const attrs = mark.attrs ?? {};
    switch (mark.type) {
      case "bold":
        open += "<strong>";
        close = "</strong>" + close;
        break;
      case "italic":
        open += "<em>";
        close = "</em>" + close;
        break;
      case "underline":
        open += "<u>";
        close = "</u>" + close;
        break;
      case "strike":
        open += "<s>";
        close = "</s>" + close;
        break;
      case "textStyle": {
        const color = safeColor(attrs.color);
        if (color) {
          open += `<span style="color:${escapeHtml(color)}">`;
          close = "</span>" + close;
        } else if (typeof attrs.color === "string" && attrs.color !== "") {
          warn(
            ctx,
            "Some text colors can't be shown in email and were removed.",
          );
        }
        break;
      }
      case "subscript":
        open += "<sub>";
        close = "</sub>" + close;
        break;
      case "superscript":
        open += "<sup>";
        close = "</sup>" + close;
        break;
      case "highlight": {
        const color = safeColor(attrs.color) ?? "#fef08a";
        open += `<span style="background-color:${escapeHtml(color)}">`;
        close = "</span>" + close;
        break;
      }
      case "link": {
        const safe = safeHref(attrs.href, ctx.baseUrl);
        if (!safe) {
          warn(
            ctx,
            "Links must be web addresses (https://…), email addresses (mailto:) or pages on your site; other links were removed.",
          );
          break;
        }
        href = safe;
        const variant: unknown = attrs.variant;
        const style =
          variant === "solid"
            ? `display:inline-block;padding:10px 20px;border-radius:6px;background-color:#111827;color:#ffffff;text-decoration:none;font-weight:600`
            : variant === "outline"
              ? `display:inline-block;padding:9px 19px;border-radius:6px;border:1px solid #111827;color:#111827;text-decoration:none;font-weight:600`
              : `color:${LINK_COLOR};text-decoration:underline`;
        link = `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener" style="${style}">`;
        linkClose = "</a>";
        break;
      }
      default:
        unknownMarkWarning(ctx, mark.type);
    }
  }
  // The link wraps everything so an inner color span can override its color.
  return { open: link + open, close: close + linkClose, href };
}

function renderImage(node: JSONContent, ctx: Ctx, inline: boolean): Rendered {
  const attrs = attrOf(node);
  const src = safeImageSrc(attrs.src);
  if (!src) {
    warn(
      ctx,
      "An image without a public https address was left out. Re-add it from your computer or the media library.",
    );
    return { html: "", text: "" };
  }
  const alt = typeof attrs.alt === "string" ? attrs.alt : "";

  const styles: string[] = [];
  let widthAttr = "";
  const percent =
    typeof attrs.size === "string" ? IMAGE_SIZE_PERCENT[attrs.size] : undefined;
  const numeric = Number(attrs.width);
  if (percent !== undefined) {
    styles.push(`width:${percent}%`);
  } else if (Number.isFinite(numeric) && numeric > 0) {
    const w = Math.min(Math.round(numeric), EMAIL_IMAGE_MAX_WIDTH);
    widthAttr = ` width="${w}"`;
    styles.push(`width:${w}px`);
  }
  styles.push("max-width:100%", "height:auto", "display:block", "border:0");
  const align = attrs.align;
  const margin = inline ? "0" : "0 0 16px";
  if (align === "center")
    styles.push(`margin:${margin};margin-left:auto;margin-right:auto`);
  else if (align === "right")
    styles.push(`margin:${margin};margin-left:auto;margin-right:0`);
  else styles.push(`margin:${margin}`);

  const html = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr} style="${styles.join(";")}">`;
  return { html, text: `[${alt.trim() || "image"}]` };
}

function renderInline(children: JSONContent[], ctx: Ctx): Rendered {
  let html = "";
  let text = "";
  for (const child of children) {
    if (child.type === "text") {
      const value = typeof child.text === "string" ? child.text : "";
      if (value === "") continue;
      const { open, close, href } = renderMarks(child, ctx);
      html += `${open}${escapeHtml(value)}${close}`;
      text += href && href !== value ? `${value} (${href})` : value;
    } else if (child.type === "hardBreak") {
      html += "<br>";
      text += "\n";
    } else if (child.type === "image") {
      const img = renderImage(child, ctx, true);
      html += img.html;
      text += img.text;
    } else {
      // Unknown inline node: keep any text it holds.
      warnUnknown(ctx, child.type);
      const blocks = collectTextBlocks(child);
      const joined = blocks.join(" ");
      html += escapeHtml(joined);
      text += joined;
    }
  }
  return { html, text };
}

function warnUnknown(ctx: Ctx, type: string | undefined) {
  const name = type ?? "unknown";
  const label = NODE_LABELS[name];
  warn(
    ctx,
    label
      ? `${label} (${name}) can't be shown in email; only their text is kept.`
      : `Content of type "${name}" can't be shown in email; only its text is kept.`,
  );
}

function plainParagraph(value: string): Rendered {
  return {
    html: `<p style="${baseText};margin:0 0 16px">${escapeHtml(value).replace(/\n/g, "<br>")}</p>`,
    text: value,
  };
}

function renderList(
  node: JSONContent,
  ctx: Ctx,
  depth: number,
  ordered: boolean,
): Rendered {
  const tag = ordered ? "ol" : "ul";
  const attrs = attrOf(node);
  const start =
    ordered && typeof attrs.start === "number" && attrs.start > 1
      ? Math.floor(attrs.start)
      : 1;
  const items = nodeContent(node).filter((c) => c.type === "listItem");
  for (const c of nodeContent(node)) {
    if (c.type !== "listItem") warnUnknown(ctx, c.type);
  }
  const nested = depth > 0;
  const margin = nested ? "6px 0 0" : "0 0 16px";
  let html = `<${tag}${start > 1 ? ` start="${start}"` : ""} style="margin:${margin};padding:0 0 0 24px;${baseText}">`;
  const lines: string[] = [];
  items.forEach((item, i) => {
    const marker = ordered ? `${start + i}. ` : "- ";
    const indent = " ".repeat(marker.length);
    const parts: string[] = [];
    let itemHtml = "";
    for (const child of nodeContent(item)) {
      if (child.type === "paragraph") {
        const inline = renderInline(nodeContent(child), ctx);
        const align = safeAlign(attrOf(child).textAlign);
        itemHtml += `<div style="${blockStyle(align, "margin:0")}">${inline.html}</div>`;
        parts.push(inline.text);
      } else {
        const r = renderBlock(child, ctx, depth + 1);
        itemHtml += r.html;
        if (r.text) parts.push(r.text);
      }
    }
    html += `<li style="margin:0 0 6px;${baseText}">${itemHtml}</li>`;
    const body = parts.join("\n").split("\n");
    lines.push(
      body.map((l, idx) => (idx === 0 ? marker + l : indent + l)).join("\n"),
    );
  });
  html += `</${tag}>`;
  return { html: items.length ? html : "", text: lines.join("\n") };
}

function renderBlock(node: JSONContent, ctx: Ctx, depth: number): Rendered {
  if (depth > MAX_DEPTH) {
    warn(ctx, "Content nested too deeply was left out.");
    return { html: "", text: "" };
  }
  const attrs = attrOf(node);
  switch (node.type) {
    case "paragraph": {
      const inline = renderInline(nodeContent(node), ctx);
      if (inline.html === "") {
        // An empty paragraph is a deliberate gap in the editor.
        return {
          html: `<p style="${baseText};margin:0 0 16px">&nbsp;</p>`,
          text: "",
        };
      }
      const align = safeAlign(attrs.textAlign);
      return {
        html: `<p style="${blockStyle(align, `${baseText};margin:0 0 16px`)}">${inline.html}</p>`,
        text: inline.text,
      };
    }
    case "heading": {
      const raw = Number(attrs.level);
      const level = Math.min(
        3,
        Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : 2),
      );
      const size = level === 1 ? "28px" : level === 2 ? "22px" : "18px";
      const lh = level === 1 ? "36px" : level === 2 ? "30px" : "26px";
      const inline = renderInline(nodeContent(node), ctx);
      if (inline.html === "") return { html: "", text: "" };
      const align = safeAlign(attrs.textAlign);
      return {
        html: `<h${level} style="${blockStyle(align, `margin:24px 0 12px;font-size:${size};line-height:${lh};font-weight:700;color:#111827`)}">${inline.html}</h${level}>`,
        text: inline.text,
      };
    }
    case "bulletList":
      return renderList(node, ctx, depth, false);
    case "orderedList":
      return renderList(node, ctx, depth, true);
    case "blockquote": {
      const inner = renderBlocks(nodeContent(node), ctx, depth + 1);
      if (inner.html === "") return { html: "", text: "" };
      return {
        html: `<blockquote style="margin:0 0 16px;padding:4px 0 4px 16px;border-left:3px solid #d1d5db;color:#4b5563">${inner.html}</blockquote>`,
        text: inner.text
          .split("\n")
          .map((l) => (l ? `> ${l}` : ">"))
          .join("\n"),
      };
    }
    case "horizontalRule":
      return {
        html: `<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">`,
        text: "---",
      };
    case "image":
      return renderImage(node, ctx, false);
    case "listItem":
      // A stray list item outside a list: render its blocks.
      return renderBlocks(nodeContent(node), ctx, depth + 1);
    default: {
      warnUnknown(ctx, node.type);
      const blocks = collectTextBlocks(node);
      if (blocks.length === 0) return { html: "", text: "" };
      const rendered = blocks.map(plainParagraph);
      return {
        html: rendered.map((r) => r.html).join(""),
        text: rendered.map((r) => r.text).join("\n\n"),
      };
    }
  }
}

function renderBlocks(nodes: JSONContent[], ctx: Ctx, depth: number): Rendered {
  const parts = nodes.map((n) => renderBlock(n, ctx, depth));
  return {
    html: parts.map((p) => p.html).join(""),
    text: parts
      .map((p) => p.text)
      .filter((t, i) => t !== "" || parts[i]!.html !== "")
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n"),
  };
}

export function tiptapToEmailHtml(
  doc: JSONContent | null | undefined,
  options: TiptapEmailOptions = {},
): TiptapEmailResult {
  const ctx: Ctx = {
    warnings: new Set(),
    baseUrl: options.baseUrl?.trim() ?? null,
  };
  if (!doc || typeof doc !== "object" || doc.type !== "doc") {
    return { html: "", text: "", warnings: [] };
  }
  const { html, text } = renderBlocks(nodeContent(doc), ctx, 0);
  return {
    html,
    text: text.trim(),
    warnings: [...ctx.warnings],
  };
}

/**
 * True when the document would produce visible content: any text or at least
 * one sendable image. Used to refuse sending an empty campaign.
 */
export function tiptapHasContent(doc: JSONContent | null | undefined): boolean {
  const { html, text } = tiptapToEmailHtml(doc);
  return (
    text.replace(/\[image\]/g, "x").trim() !== "" || html.includes("<img ")
  );
}

/** A tiptap document for an existing plain-text body (blank line = paragraph). */
export function plainTextToTiptapDoc(value: string | null | undefined): {
  type: "doc";
  content: JSONContent[];
} {
  const blocks = (value ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.replace(/^\n+|\n+$/g, ""))
    .filter((b) => b.trim() !== "");
  return {
    type: "doc",
    content: blocks.map((block) => {
      const content: JSONContent[] = [];
      block.split("\n").forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line !== "") content.push({ type: "text", text: line });
      });
      return { type: "paragraph", content };
    }),
  };
}
