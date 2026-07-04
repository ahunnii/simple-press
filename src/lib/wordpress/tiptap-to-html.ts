import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";

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
 * Server-safe extension list. Mirrors `src/components/tiptap-renderer.tsx`
 * MINUS the Gallery/Embed extensions (handled manually here). `TableKit` is
 * imported directly from `@tiptap/extension-table` (server-safe) rather than
 * the client re-export.
 */
const SERVER_EXTENSIONS = [
  // StarterKit v3 bundles Link/Underline; disable them so the standalone
  // configured extensions below don't register duplicates.
  StarterKit.configure({ link: false, underline: false }),
  Link.configure({
    HTMLAttributes: {
      rel: "noopener noreferrer nofollow",
    },
    protocols: ["http", "https", "mailto", "tel"],
  }),
  Image,
  Underline,
  TextStyle,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  TableKit,
];

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
  out = out.replace(
    /\b(href|src)\s*=\s*"\s*javascript:[^"]*"/gi,
    '$1="#"',
  );
  out = out.replace(
    /\b(href|src)\s*=\s*'\s*javascript:[^']*'/gi,
    "$1='#'",
  );
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

  const fragments: string[] = [];

  for (const node of content.content) {
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
        continue;
      }
      for (const img of gallery.images) {
        addUrl(img.url);
      }
      fragments.push(renderGallery(gallery));
      continue;
    }

    if (isEmbedNode(node)) {
      const src = node.attrs.src ? String(node.attrs.src) : "";
      if (src === "") {
        warnings.push("Skipped embed node: missing src");
        continue;
      }
      fragments.push(
        renderEmbed({
          src,
          height: node.attrs.height,
          title:
            typeof node.attrs.title === "string" ? node.attrs.title : undefined,
        }),
      );
      continue;
    }

    try {
      fragments.push(
        generateHTML(
          {
            type: "doc",
            content: [node] as TiptapDoc["content"],
          },
          SERVER_EXTENSIONS,
        ),
      );
    } catch {
      warnings.push(`Skipped unknown node type: ${node.type ?? "unknown"}`);
    }
  }

  return {
    html: sanitizeHtml(fragments.join("")),
    imageUrls,
    warnings,
  };
}
