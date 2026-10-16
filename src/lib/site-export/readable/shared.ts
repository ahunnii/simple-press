/**
 * Small rendering helpers shared by every readable-document builder.
 *
 * Conventions: functions named `*Html` return trusted, already-escaped HTML.
 * Everything that touches database text goes through `esc()` (or a helper that
 * does). The only unescaped HTML that ever flows in is `tiptapToHtml` output,
 * which is produced by a schema-sanitized serializer.
 */
import { safeHref } from "~/lib/safe-href";
import type { GalleryForHtml } from "~/lib/wordpress/tiptap-to-html";
import { tiptapToHtml } from "~/lib/wordpress/tiptap-to-html";
import { esc, hrefTo, renderDocument } from "../html";
import type { MediaIndex } from "../types";
import { resolveMediaHref } from "../types";
import type { ImageRef, RenderCtx } from "./types";

// ─── Text ────────────────────────────────────────────────────────────────────

/** Plain text → escaped paragraphs (blank line = new paragraph, newline = <br>). */
export function plainTextHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Escaped single-line text; newlines become <br>. Empty → "". */
export function inlineText(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  const t = String(text).trim();
  return t === "" ? "" : esc(t).replace(/\n/g, "<br>");
}

/** "hero-heading" / "heroHeading" / "hero_heading" → "Hero heading". */
export function humanize(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A clickable link when the scheme is safe, otherwise plain escaped text. */
export function linkHtml(url: string | null | undefined, label?: string): string {
  if (!url) return "";
  const href = safeHref(url);
  const text = esc(label ?? url);
  return href ? `<a href="${esc(href)}">${text}</a>` : text;
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDate(
  date: Date | null | undefined,
  timeZone = "UTC",
): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/** Last path segment of a URL, decoded ("…/Blue%20Mug.jpg?x=1" → "Blue Mug.jpg"). */
export function fileNameOf(url: string): string {
  const path = url.split(/[?#]/)[0] ?? url;
  const last = path.split("/").filter(Boolean).pop() ?? url;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

// ─── Media ───────────────────────────────────────────────────────────────────

export function mediaHref(
  ctx: Pick<RenderCtx, "media">,
  docPath: string,
  url: string | null | undefined,
): string | null {
  return resolveMediaHref(ctx.media, docPath, url);
}

/** `<img>` for a stored/remote image, or "" when there is no url. */
export function imgHtml(
  ctx: Pick<RenderCtx, "media">,
  docPath: string,
  url: string | null | undefined,
  alt?: string | null,
  maxWidth?: number,
): string {
  const src = mediaHref(ctx, docPath, url);
  // A site-relative path that isn't in the export (e.g. "/placeholder.svg",
  // which media.ts deliberately skips) can't load from an offline file.
  if (!src || (src.startsWith("/") && !src.startsWith("//"))) return "";
  const style = maxWidth ? ` style="max-width:${Math.round(maxWidth)}px"` : "";
  return `<img src="${esc(src)}" alt="${esc(alt ?? "")}" loading="lazy"${style}>`;
}

/** Grid of photos with their file name (or caption) underneath. */
export function photosGridHtml(
  ctx: Pick<RenderCtx, "media">,
  docPath: string,
  images: ImageRef[],
): string {
  const figures = images
    .filter((img) => Boolean(img.url))
    .map((img) => {
      const caption = img.caption?.trim();
      const alt = img.alt?.trim();
      const lines = [
        caption ? `<span>${esc(caption)}</span>` : "",
        alt && alt !== caption ? `<span>Alt text: ${esc(alt)}</span>` : "",
        `<span>${esc(fileNameOf(img.url))}</span>`,
      ]
        .filter(Boolean)
        .join("<br>");
      return `<figure>${imgHtml(ctx, docPath, img.url, img.alt)}<figcaption>${lines}</figcaption></figure>`;
    });
  return figures.length > 0 ? `<div class="photos">${figures.join("")}</div>` : "";
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#0?39);/g, (m) => ENTITY_MAP[m] ?? m);
}

const MEDIA_TAG_RE = /<(?:img|video|source)\b[^>]*>/gi;
const SRC_ATTR_RE = /(\bsrc\s*=\s*)(?:"([^"]*)"|'([^']*)')/i;

const ANCHOR_TAG_RE = /<a\b[^>]*>/gi;
const HREF_ATTR_RE = /(\bhref\s*=\s*)(?:"([^"]*)"|'([^']*)')/i;

/**
 * Post-process serialized rich-text HTML so `<img>` / `<video>` / `<source>`
 * sources point at the photos inside the export when we have them, and
 * `<a href>` links to a stored file (a Media Library PDF) open the copy in
 * the export — keeping any `#page=…` fragment.
 */
export function rewriteMediaInHtml(
  html: string,
  docPath: string,
  media: Pick<MediaIndex, "byUrl">,
): string {
  return html
    .replace(MEDIA_TAG_RE, (tag) =>
      tag.replace(SRC_ATTR_RE, (whole, pre: string, dq?: string, sq?: string) => {
        const original = decodeEntities(dq ?? sq ?? "");
        const resolved = resolveMediaHref(media, docPath, original);
        if (!resolved || resolved === original) return whole;
        return `${pre}"${esc(resolved)}"`;
      }),
    )
    .replace(ANCHOR_TAG_RE, (tag) =>
      tag.replace(HREF_ATTR_RE, (whole, pre: string, dq?: string, sq?: string) => {
        const original = decodeEntities(dq ?? sq ?? "");
        const resolved = resolveMediaHref(media, docPath, original);
        if (!resolved || resolved === original) return whole;
        const h = original.indexOf("#");
        const fragment = h >= 0 ? original.slice(h) : "";
        return `${pre}"${esc(resolved + fragment)}"`;
      }),
    );
}

export interface RichTextResult {
  html: string;
  warnings: string[];
}

/** TipTap JSON → HTML with media rewritten for the export. */
export function richTextHtml(
  ctx: RenderCtx,
  docPath: string,
  content: unknown,
): RichTextResult {
  if (!content) return { html: "", warnings: [] };
  const { html, warnings } = tiptapToHtml(content, ctx.galleryMap ?? new Map<string, GalleryForHtml>());
  for (const w of warnings) ctx.onWarning?.(docPath, w);
  return { html: rewriteMediaInHtml(html, docPath, ctx.media), warnings };
}

// ─── Document chrome ─────────────────────────────────────────────────────────

export function shell(
  ctx: Pick<RenderCtx, "business">,
  opts: {
    docPath: string;
    title: string;
    subtitle?: string;
    breadcrumbs?: Array<{ label: string; zipPath?: string }>;
    bodyHtml: string;
  },
): string {
  return renderDocument({
    ...opts,
    storeName: ctx.business.name,
  });
}

/** A heading + body block, dropped when the body is empty. */
export function section(title: string, bodyHtml: string, level: 2 | 3 = 2): string {
  if (!bodyHtml) return "";
  return `<h${level}>${esc(title)}</h${level}>${bodyHtml}`;
}

/** Simple table from header labels and pre-escaped cell HTML. Empty → "". */
export function tableHtml(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  return `<table><thead><tr>${headers
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

/** A "<ul>" from pre-escaped items. */
export function listHtml(items: string[]): string {
  const kept = items.filter(Boolean);
  return kept.length > 0 ? `<ul>${kept.map((i) => `<li>${i}</li>`).join("")}</ul>` : "";
}

/** Common SEO rows (label → value) for any record with meta fields. */
export function seoRows(meta: {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}): Array<[string, string]> {
  return [
    ["SEO title", inlineText(meta.metaTitle)],
    ["SEO description", inlineText(meta.metaDescription)],
    ["SEO keywords", inlineText(meta.metaKeywords)],
  ];
}

/** Remove duplicate warnings, keep order. */
export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// ─── Section index pages ─────────────────────────────────────────────────────

/** Table-of-contents document for a folder ("Blog/index.html"). */
export function indexDoc(
  ctx: Pick<RenderCtx, "business">,
  opts: {
    docPath: string;
    title: string;
    intro?: string;
    headers: string[];
    /** Pre-escaped cell HTML per row. */
    rows: string[][];
    breadcrumbs?: Array<{ label: string; zipPath?: string }>;
    extraHtml?: string;
  },
): string {
  const body =
    (opts.intro ? `<p>${esc(opts.intro)}</p>` : "") +
    (opts.rows.length > 0
      ? tableHtml(opts.headers, opts.rows)
      : `<p class="muted">Nothing here yet.</p>`) +
    (opts.extraHtml ?? "");
  return shell(ctx, {
    docPath: opts.docPath,
    title: opts.title,
    breadcrumbs: opts.breadcrumbs,
    bodyHtml: body,
  });
}

/** `<a>` to another doc, relative to `docPath`. */
export function docLink(fromDocPath: string, toZipPath: string, label: string): string {
  return `<a href="${esc(hrefTo(fromDocPath, toZipPath))}">${esc(label)}</a>`;
}
