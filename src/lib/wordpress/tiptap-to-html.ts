import { getSchema } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";

import {
  coerceColumnLayout,
  COLUMN_CLASS,
  COLUMNS_GRID_CLASS,
  columnsClassName,
} from "~/lib/tiptap/columns-node";
import {
  DETAILS_CLASS,
  DETAILS_CONTENT_CLASS,
  DETAILS_CONTENT_DATA_TYPE,
  DETAILS_SUMMARY_CLASS,
} from "~/lib/tiptap/details-nodes";
import { RENDERER_BASE_EXTENSIONS } from "~/lib/tiptap/renderer-extensions";
import { sanitizeTiptapDoc } from "~/lib/tiptap/sanitize";

/**
 * Server-side TipTap document -> HTML serializer for the WordPress export.
 *
 * This module MUST stay server-safe: it renders TipTap JSON to an HTML string
 * without React, the DOM, Prisma, or any `"use client"` code. The custom
 * `gallery` and `embed` nodes are handled by hand (their real extensions pull
 * in `@tiptap/react` node views, which are not importable server-side), and
 * every other node is rendered through `@tiptap/html`'s `generateHTML`
 * (zeed-dom based, node-compatible).
 */

/** Owner-saved gallery, flattened for HTML rendering. */
export interface GalleryForHtml {
  id: string;
  name: string;
  showCaptions: boolean;
  images: { url: string; altText: string | null; caption: string | null }[];
}

export type GalleryMap = Map<string, GalleryForHtml>;

export interface TiptapHtmlResult {
  /** Serialized HTML fragment. */
  html: string;
  /** Deduped image URLs discovered (image nodes + gallery images). */
  imageUrls: string[];
  /** Non-fatal issues encountered during serialization. */
  warnings: string[];
}

/** TipTap node (minimal shape we need for the content walk). */
interface ContentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
}

interface TiptapDoc {
  type: "doc";
  content: ContentNode[];
}

/**
 * ProseMirror schema derived from the storefront renderer's own node/mark
 * half (`RENDERER_BASE_EXTENSIONS`, React-free by contract) — so the export
 * can't drift from what the storefront renders — and the node/mark/attr
 * allowlist `sanitizeTiptapDoc` enforces before every `generateHTML` call.
 * The Gallery/Embed/QuoteCalculator/Form extensions the renderer appends are
 * absent: those nodes are handled by hand below. The `columns`/`column` and
 * `details` containers are walked by hand too, with the same class helpers
 * their `renderHTML` uses.
 */
const SERVER_SCHEMA = getSchema(RENDERER_BASE_EXTENSIONS);

function isContentNode(value: unknown): value is ContentNode {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isTiptapDoc(value: unknown): value is TiptapDoc {
  if (!isContentNode(value)) return false;
  if (value.type !== "doc" || !Array.isArray(value.content)) return false;
  return value.content.every(isContentNode);
}

/** Escape a value for safe interpolation into HTML text or an attribute. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Light regex sanitize pass over generated HTML. Strips inline event-handler
 * attributes and neutralizes `javascript:` URLs in href/src. Content is
 * owner-authored and destined for an export file, so this deliberately avoids
 * pulling in a DOM/sanitizer dependency server-side.
 */
function sanitizeHtml(html: string): string {
  let out = html;
  // zeed-dom (the @tiptap/html/server DOM) stamps an XHTML namespace on each
  // top-level element it serializes; it's noise in WordPress post content.
  out = out.replaceAll(' xmlns="http://www.w3.org/1999/xhtml"', "");
  // Strip inline event handlers:  on...="..."  and  on...='...'
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  // Neutralize javascript: in href/src attribute values.
  out = out.replace(/\b(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  out = out.replace(/\b(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
  return out;
}

function isGalleryNode(
  node: ContentNode,
): node is ContentNode & { attrs: { galleryId?: string } } {
  return (
    node.type === "gallery" && node.attrs != null && "galleryId" in node.attrs
  );
}

function isEmbedNode(node: ContentNode): node is ContentNode & {
  attrs: {
    src?: string;
    height?: number | string;
    title?: string;
  };
} {
  return node.type === "embed" && node.attrs != null && "src" in node.attrs;
}

function isQuoteCalculatorNode(node: ContentNode): node is ContentNode & {
  attrs: { calculatorId?: string; businessId?: string };
} {
  return node.type === "quoteCalculator" && node.attrs != null;
}

function isFormNode(
  node: ContentNode,
): node is ContentNode & { attrs: { formId?: string } } {
  return node.type === "form" && node.attrs != null;
}

/** Render a resolved gallery to a `wp-block-gallery` figure. */
function renderGallery(gallery: GalleryForHtml): string {
  const inner = gallery.images
    .map((img) => {
      const parts = [
        `<img src="${escapeAttr(img.url)}" alt="${escapeAttr(
          img.altText ?? "",
        )}">`,
      ];
      const caption = img.caption?.trim() ?? "";
      if (gallery.showCaptions && caption !== "") {
        parts.push(`<figcaption>${escapeAttr(img.caption ?? "")}</figcaption>`);
      }
      return `<figure>${parts.join("")}</figure>`;
    })
    .join("");
  return `<figure class="wp-block-gallery">${inner}</figure>`;
}

/** Render an embed node to a plain lazy iframe (dialog semantics ignored). */
function renderEmbed(attrs: {
  src?: string;
  height?: number | string;
  title?: string;
}): string {
  const parts = [`src="${escapeAttr(String(attrs.src ?? ""))}"`];
  if (attrs.height != null && attrs.height !== "") {
    parts.push(`height="${escapeAttr(String(attrs.height))}"`);
  }
  if (typeof attrs.title === "string" && attrs.title !== "") {
    parts.push(`title="${escapeAttr(attrs.title)}"`);
  }
  parts.push(`loading="lazy"`);
  return `<figure><iframe ${parts.join(" ")}></iframe></figure>`;
}

/**
 * Serialize a TipTap document to an HTML string for the WordPress export.
 * Never throws — malformed input yields an empty result.
 */
export function tiptapToHtml(
  content: unknown,
  galleries: GalleryMap,
): TiptapHtmlResult {
  const warnings: string[] = [];
  const imageUrls: string[] = [];
  const seen = new Set<string>();

  const addUrl = (url: unknown): void => {
    if (typeof url !== "string" || url === "" || seen.has(url)) return;
    seen.add(url);
    imageUrls.push(url);
  };

  if (!isTiptapDoc(content)) {
    return { html: "", imageUrls: [], warnings: [] };
  }

  // Deep-walk for image nodes (they can be nested inside blockquotes, table
  // cells, etc.). Gallery image URLs are collected during the render pass.
  const collectImages = (node: ContentNode): void => {
    if (node.type === "image" && node.attrs) {
      addUrl(node.attrs.src);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (isContentNode(child)) collectImages(child);
      }
    }
  };
  for (const node of content.content) {
    collectImages(node);
  }

  /**
   * Renders one node (and, for containers, its subtree) to HTML, or `null`
   * when it is skipped. Recursive so the gallery/embed/quote/form handlers
   * also apply to nodes nested inside a `columns` row or a `details`
   * collapsible — sanitizing a whole row up front would drop those nodes,
   * which `SERVER_SCHEMA` deliberately doesn't declare.
   */
  const renderNodeHtml = (node: ContentNode): string | null => {
    if (node.type === "columns") {
      const layout = coerceColumnLayout(node.attrs?.layout);
      // `wp-block-columns` sits on the grid wrapper (the columns' direct
      // parent), not the outer row, so WordPress's flex rules for
      // `.wp-block-columns > .wp-block-column` still match after import.
      return `<div class="${columnsClassName(layout)}" data-type="columns" data-layout="${layout}"><div class="${COLUMNS_GRID_CLASS} wp-block-columns">${renderChildren(node)}</div></div>`;
    }
    if (node.type === "column") {
      return `<div class="${COLUMN_CLASS} wp-block-column" data-type="column">${renderChildren(node)}</div>`;
    }
    if (node.type === "details") {
      return `<details class="${DETAILS_CLASS}">${renderChildren(node)}</details>`;
    }
    if (node.type === "detailsSummary") {
      return `<summary class="${DETAILS_SUMMARY_CLASS}">${renderSummaryHtml(node)}</summary>`;
    }
    if (node.type === "detailsContent") {
      return `<div class="${DETAILS_CONTENT_CLASS}" data-type="${DETAILS_CONTENT_DATA_TYPE}">${renderChildren(node)}</div>`;
    }

    if (isGalleryNode(node)) {
      const galleryId = node.attrs.galleryId
        ? String(node.attrs.galleryId)
        : "";
      const gallery = galleryId ? galleries.get(galleryId) : undefined;
      if (!gallery) {
        warnings.push(
          `Skipped gallery node: gallery not found (id: ${
            galleryId || "missing"
          })`,
        );
        return null;
      }
      for (const img of gallery.images) {
        addUrl(img.url);
      }
      return renderGallery(gallery);
    }

    if (isEmbedNode(node)) {
      const src = node.attrs.src ? String(node.attrs.src) : "";
      if (src === "") {
        warnings.push("Skipped embed node: missing src");
        return null;
      }
      return renderEmbed({
        src,
        height: node.attrs.height,
        title:
          typeof node.attrs.title === "string" ? node.attrs.title : undefined,
      });
    }

    if (isQuoteCalculatorNode(node)) {
      // The node's `width`/`height`/`density` display-sizing attrs
      // (`~/lib/quote/quote-display.ts`) are intentionally ignored here —
      // the export always emits this static placeholder text, never the
      // widget itself, so there is nothing for them to size.
      warnings.push(
        "Skipped quote calculator node (interactive widget has no WordPress equivalent)",
      );
      return "<p><em>[Quote calculator: interactive widget not exported]</em></p>";
    }

    if (isFormNode(node)) {
      warnings.push(
        "Skipped form node (interactive widget has no WordPress equivalent)",
      );
      return "<p><em>[Form: interactive widget not exported]</em></p>";
    }

    // Sanitize the JSON against this module's own schema BEFORE serializing.
    // `sanitizeHtml` below is a regex pass over the output and was the only
    // guard here; this makes the node/mark/attr allowlist schema-derived, and
    // shares the exact rules the storefront renderer applies. It runs
    // per-node, after the gallery/embed/quote branches above, because those
    // nodes are handled by hand here and are deliberately absent from
    // `SERVER_SCHEMA` — sanitizing the whole document up front would drop
    // them before their handlers ever ran.
    const safeDoc = sanitizeTiptapDoc(
      { type: "doc", content: [node] },
      SERVER_SCHEMA,
    );
    if (!safeDoc?.content?.length) {
      warnings.push(`Skipped unknown node type: ${node.type ?? "unknown"}`);
      return null;
    }

    try {
      return generateHTML(safeDoc, RENDERER_BASE_EXTENSIONS);
    } catch {
      warnings.push(`Skipped unknown node type: ${node.type ?? "unknown"}`);
      return null;
    }
  };

  const renderChildren = (node: ContentNode): string => {
    const parts: string[] = [];
    for (const child of node.content ?? []) {
      if (!isContentNode(child)) continue;
      const html = renderNodeHtml(child);
      if (html !== null) parts.push(html);
    }
    return parts.join("");
  };

  /**
   * Inline HTML for a `detailsSummary` (inline content): sanitized and
   * serialized as a paragraph so marks/links render normally, then unwrapped.
   */
  const renderSummaryHtml = (node: ContentNode): string => {
    const safeDoc = sanitizeTiptapDoc(
      { type: "doc", content: [{ type: "paragraph", content: node.content }] },
      SERVER_SCHEMA,
    );
    if (!safeDoc?.content?.length) return "";
    try {
      const html = generateHTML(safeDoc, RENDERER_BASE_EXTENSIONS).trim();
      return /^<p(?:\s[^>]*)?>([\s\S]*)<\/p>$/.exec(html)?.[1] ?? "";
    } catch {
      return "";
    }
  };

  const fragments: string[] = [];
  for (const node of content.content) {
    const html = renderNodeHtml(node);
    if (html !== null) fragments.push(html);
  }

  return {
    html: sanitizeHtml(fragments.join("")),
    imageUrls,
    warnings,
  };
}
