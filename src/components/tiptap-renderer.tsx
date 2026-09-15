"use client";

import { useMemo } from "react";
import { getSchema } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import { ExternalLink, Images } from "lucide-react";

import { sanitizeEmbedSrc } from "~/lib/embed";
import {
  coerceQuoteDensity,
  coerceQuoteHeight,
  coerceQuoteLayout,
  coerceQuoteWidth,
} from "~/lib/quote/quote-display";
import { RENDERER_BASE_EXTENSIONS } from "~/lib/tiptap/renderer-extensions";
import { sanitizeTiptapDoc } from "~/lib/tiptap/sanitize";
import { api } from "~/trpc/react";
import { Embed } from "~/components/ui/minimal-tiptap/extensions/embed";
import { Gallery } from "~/components/ui/minimal-tiptap/extensions/gallery";
import { QuoteCalculator } from "~/components/ui/minimal-tiptap/extensions/quote-calculator";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { GalleryRenderer } from "~/components/gallery-renderer";
import { QuoteCalculatorBlock } from "~/components/quote/quote-calculator-block";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/** TipTap document JSON — matches first parameter of generateHTML */
export type TiptapJSON = Parameters<typeof generateHTML>[0];

type TiptapRendererProps = {
  content: TiptapJSON | null | undefined;
  className?: string;
};

const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * The node/mark half lives in `~/lib/tiptap/renderer-extensions` so a node
 * test can build the same schema; the three custom nodes are appended here
 * because their React node views can't be imported outside the browser build.
 */
const extensions = [
  ...RENDERER_BASE_EXTENSIONS,
  Gallery,
  Embed,
  QuoteCalculator,
];

/**
 * Derived once. This is what makes `sanitizeTiptapDoc`'s allowlist the exact
 * set of nodes, marks and attrs this renderer can actually render — including
 * `gallery`, `embed` and `quoteCalculator`, which the custom dispatch below
 * handles and which would otherwise be dropped as unknown.
 */
const schema = getSchema(extensions);

/** Renders a single gallery by id (for storefront page content). */
function GalleryBlock({ galleryId }: { galleryId: string }) {
  const {
    data: gallery,
    isLoading,
    error,
  } = api.gallery.getByIdPublic.useQuery(galleryId, {
    enabled: !!galleryId,
    retry: false,
  });

  if (!galleryId) return null;

  if (isLoading) {
    return (
      <div className="my-6 animate-pulse rounded-lg border border-gray-200 bg-gray-50 py-16" />
    );
  }

  // Gallery feature is disabled for this business — show a tasteful placeholder
  // so the content layout isn't broken, without exposing technical details.
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <div className="my-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-gray-400">
        <Images className="h-8 w-8 opacity-40" />
        <p className="text-sm">Gallery content is not available</p>
      </div>
    );
  }

  if (!gallery) return null;

  return (
    <div className="not-prose my-6 rounded-lg">
      <GalleryRenderer
        gallery={{
          name: gallery.name,
          description: gallery.description,
          layout: gallery.layout,
          columns: gallery.columns,
          gap: gallery.gap,
          showCaptions: gallery.showCaptions,
          enableLightbox: gallery.enableLightbox,
          aspectRatio: gallery.aspectRatio,
          captionStyle: gallery.captionStyle,
          images: gallery.images.map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            caption: img.caption,
          })),
        }}
      />
    </div>
  );
}

/** TipTap node (minimal shape we need for content walk). */
type ContentNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
};

type TiptapDoc = {
  type: "doc";
  content: ContentNode[];
};

function isContentNode(value: unknown): value is ContentNode {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isTiptapDoc(value: unknown): value is TiptapDoc {
  if (!isContentNode(value)) return false;
  if (value.type !== "doc" || !Array.isArray(value.content)) return false;
  return value.content.every(isContentNode);
}

/**
 * Client-side belt-and-braces pass over the generated markup.
 *
 * The `typeof window` early-return is no longer a hole: the server path is
 * covered by `sanitizeTiptapDoc`, which runs on the JSON *before*
 * `generateHTML` on both sides, so server and client render from identical
 * input and this pass has nothing left to find. (It used to be the only
 * sanitizer in the pipeline, which meant SSR output was never cleaned at all
 * — `@tiptap/html` resolves to `dist/server/index.js` under SSR, so the
 * server render succeeded and skipped straight past this function.)
 */
function sanitizeGeneratedHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    }
  });

  doc.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    try {
      const parsed = new URL(href, window.location.origin);
      if (!ALLOWED_LINK_PROTOCOLS.has(parsed.protocol)) {
        link.removeAttribute("href");
      }
    } catch {
      link.removeAttribute("href");
    }

    link.setAttribute("rel", "noopener noreferrer nofollow");
  });

  return doc.body.innerHTML;
}

function isGalleryNode(
  node: ContentNode,
): node is ContentNode & { attrs: { galleryId?: string } } {
  return (
    node.type === "gallery" && node.attrs != null && "galleryId" in node.attrs
  );
}

function isQuoteCalculatorNode(node: ContentNode): node is ContentNode & {
  attrs: {
    calculatorId?: string | null;
    width?: unknown;
    height?: unknown;
    density?: unknown;
    layout?: unknown;
  };
} {
  return (
    node.type === "quoteCalculator" &&
    node.attrs != null &&
    "calculatorId" in node.attrs
  );
}

function isEmbedNode(node: ContentNode): node is ContentNode & {
  attrs: {
    src?: string;
    height?: number | string;
    title?: string;
    aspectRatio?: string;
    maxWidth?: string;
    displayMode?: string;
    triggerLabel?: string;
  };
} {
  return node.type === "embed" && node.attrs != null && "src" in node.attrs;
}

export function TiptapRenderer({ content, className }: TiptapRendererProps) {
  const { isEnabled } = useStorefrontFlags();
  const embedsEnabled = isEnabled("embeds");

  const elements = useMemo(() => {
    // Sanitize the JSON once, up front, against the renderer's own schema.
    // Everything below — the custom gallery/quote/embed dispatch as well as
    // the `generateHTML` fallback — reads from the result, so the server and
    // the client are rendering byte-identical input.
    const sanitized = sanitizeTiptapDoc(content, schema);
    if (!isTiptapDoc(sanitized)) {
      return [];
    }

    const nodes = sanitized.content;
    return nodes.map((node, index) => {
      if (isGalleryNode(node) && node.attrs.galleryId) {
        return (
          <GalleryBlock
            key={`gallery-${node.attrs.galleryId}-${index}`}
            galleryId={String(node.attrs.galleryId)}
          />
        );
      }
      if (isQuoteCalculatorNode(node) && node.attrs.calculatorId) {
        return (
          <QuoteCalculatorBlock
            key={`quote-${node.attrs.calculatorId}-${index}`}
            calculatorId={String(node.attrs.calculatorId)}
            width={coerceQuoteWidth(node.attrs.width)}
            height={coerceQuoteHeight(node.attrs.height)}
            density={coerceQuoteDensity(node.attrs.density)}
            layout={coerceQuoteLayout(node.attrs.layout)}
          />
        );
      }
      if (isEmbedNode(node) && node.attrs.src) {
        const src = String(node.attrs.src);
        const height = node.attrs.height
          ? Number(node.attrs.height)
          : undefined;
        const title =
          typeof node.attrs.title === "string" ? node.attrs.title : "";
        const aspectRatio =
          typeof node.attrs.aspectRatio === "string"
            ? node.attrs.aspectRatio
            : undefined;
        const maxWidth =
          typeof node.attrs.maxWidth === "string"
            ? node.attrs.maxWidth
            : undefined;
        const displayMode =
          typeof node.attrs.displayMode === "string"
            ? node.attrs.displayMode
            : undefined;
        const triggerLabel =
          typeof node.attrs.triggerLabel === "string"
            ? node.attrs.triggerLabel
            : undefined;

        // Embeds feature disabled — fall back to a plain external link (same
        // behaviour as ServiceBookingDialog) instead of rendering the iframe.
        if (!embedsEnabled) {
          const linkLabel =
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so blank/whitespace labels also fall back
            triggerLabel?.trim() || title.trim() || "View content";
          // The iframe path runs `src` through `sanitizeEmbedSrc`; this
          // fallback used to put the raw stored value straight into an
          // `href`, which is the one place an embed's src is rendered as a
          // navigable link. A src the embed rules refuse still shows its
          // label, just not as something clickable.
          const linkHref = sanitizeEmbedSrc(src);
          if (!linkHref) {
            return (
              <span
                key={`embed-${index}`}
                className="border-input bg-muted text-muted-foreground my-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                {linkLabel}
              </span>
            );
          }
          return (
            <a
              key={`embed-${index}`}
              href={linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring my-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {linkLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          );
        }

        if (displayMode === "dialog") {
          return (
            <EmbedDialog
              key={`embed-${index}`}
              src={src}
              title={title}
              aspectRatio={aspectRatio}
              height={height}
              triggerLabel={triggerLabel}
            />
          );
        }

        return (
          <EmbedFrame
            key={`embed-${index}`}
            src={src}
            height={height}
            title={title}
            aspectRatio={aspectRatio}
            maxWidth={maxWidth}
          />
        );
      }
      try {
        const html = sanitizeGeneratedHtml(
          generateHTML(
            {
              type: "doc",
              content: [node] as Parameters<typeof generateHTML>[0]["content"],
            },
            extensions,
          ),
        );
        return <div key={index} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        return null;
      }
    });
  }, [content, embedsEnabled]);

  return <div className={className}>{elements}</div>;
}
