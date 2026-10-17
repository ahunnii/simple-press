"use client";

import type { ReactNode } from "react";
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
import { preserveBlankLines } from "~/lib/tiptap/blank-lines";
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
import { isInternalHref, LINK_PROTOCOLS } from "~/lib/tiptap/link-extension";
import { RENDERER_BASE_EXTENSIONS } from "~/lib/tiptap/renderer-extensions";
import { sanitizeTiptapDoc } from "~/lib/tiptap/sanitize";
import { api } from "~/trpc/react";
import { Embed } from "~/components/ui/minimal-tiptap/extensions/embed";
import { Form } from "~/components/ui/minimal-tiptap/extensions/form";
import { Gallery } from "~/components/ui/minimal-tiptap/extensions/gallery";
import { QuoteCalculator } from "~/components/ui/minimal-tiptap/extensions/quote-calculator";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { FormBlock } from "~/components/forms/form-block";
import { GalleryRenderer } from "~/components/gallery-renderer";
import { QuoteCalculatorBlock } from "~/components/quote/quote-calculator-block";
import { RichTextVideo } from "~/components/rich-text-video";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/** TipTap document JSON — matches first parameter of generateHTML */
export type TiptapJSON = Parameters<typeof generateHTML>[0];

type TiptapRendererProps = {
  content: TiptapJSON | null | undefined;
  className?: string;
};

/** `URL.protocol` form (`"sms:"`) of the shared link allowlist, so the two can't drift. */
const ALLOWED_LINK_PROTOCOLS = new Set(LINK_PROTOCOLS.map((p) => `${p}:`));

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
  Form,
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

    // Same rule as the Link extension's own `rel`: a link to a page on this
    // site is not nofollowed. Anything else (including mailto:/tel:) is.
    if (isInternalHref(href)) {
      link.removeAttribute("rel");
    } else {
      link.setAttribute("rel", "noopener noreferrer nofollow");
    }
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

function isFormNode(
  node: ContentNode,
): node is ContentNode & { attrs: { formId?: string | null } } {
  return node.type === "form" && node.attrs != null && "formId" in node.attrs;
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

function isVideoNode(node: ContentNode): node is ContentNode & {
  attrs: { src?: string; title?: string; ambient?: boolean };
} {
  return node.type === "video" && node.attrs != null && "src" in node.attrs;
}

/** What `renderBlock` needs from the renderer's props/hooks. */
type RenderContext = {
  embedsEnabled: boolean;
};

/**
 * `generateHTML` for a single block, wrapped the way every leaf has always
 * been: one `<div>` per node. Template CSS targets that wrapper (e.g. wealth
 * `.wealth-prose > div:has(> h2)`), so top-level output must not change.
 */
/**
 * Tags a `<strong>` that opens a list item's first paragraph — nothing before
 * it — with `data-lead`, so a template can style "**Title** description"
 * items as a title line (wealth). CSS can't tell on its own:
 * `strong:first-child` ignores text nodes, so it also matches bold that sits
 * mid-sentence ("Actively practice **democratic decision-making**, …").
 * The server build of `generateHTML` stamps an `xmlns` on tags, hence the
 * optional attributes.
 */
const LEAD_BOLD = /(<li(?:\s[^>]*)?>\s*<p(?:\s[^>]*)?>)<strong>/g;

function renderLeafHtml(node: ContentNode, key: string): ReactNode {
  try {
    const html = sanitizeGeneratedHtml(
      generateHTML(
        {
          type: "doc",
          content: [node] as Parameters<typeof generateHTML>[0]["content"],
        },
        extensions,
      ).replace(LEAD_BOLD, '$1<strong data-lead="">'),
    );
    return <div key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return null;
  }
}

/**
 * Inline HTML for a `detailsSummary` (whose content is inline, not blocks):
 * rendered as a paragraph so marks/links serialize normally, then unwrapped.
 * The server build of `generateHTML` stamps an `xmlns` on the `<p>`, so the
 * opening tag may carry attributes.
 */
function renderSummaryHtml(node: ContentNode): string {
  try {
    const html = generateHTML(
      {
        type: "doc",
        content: [
          { type: "paragraph", content: node.content ?? [] },
        ] as Parameters<typeof generateHTML>[0]["content"],
      },
      extensions,
    );
    const inner =
      /^<p(?:\s[^>]*)?>([\s\S]*)<\/p>$/.exec(html.trim())?.[1] ?? "";
    return sanitizeGeneratedHtml(inner);
  } catch {
    return "";
  }
}

/** `renderBlock` over a container's children; keys extend the parent's path. */
function renderChildren(
  node: ContentNode,
  key: string,
  ctx: RenderContext,
): ReactNode[] {
  return (node.content ?? []).map((child, index) =>
    renderBlock(child, `${key}.${index}`, ctx),
  );
}

/**
 * Renders one block node. Container nodes (`columns`/`column` and the
 * `details` trio) build React shells with the exact classes/data attrs their
 * `renderHTML` produces (`~/lib/tiptap/columns-node`,
 * `~/lib/tiptap/details-nodes`) and recurse, so a gallery/form/embed nested
 * inside a column or collapsible is dispatched to its live component instead
 * of being serialized as an empty div. Every other node is a leaf, rendered
 * exactly as it was when only the top level was dispatched.
 *
 * `key` is the node's index path from the doc root (`"3"` at the top level,
 * `"3.1.0"` nested), so keys are unique across nesting and stable between
 * renders of the same doc.
 */
function renderBlock(
  node: ContentNode,
  key: string,
  ctx: RenderContext,
): ReactNode {
  if (node.type === "columns") {
    const layout = coerceColumnLayout(node.attrs?.layout);
    return (
      <div
        key={key}
        className={columnsClassName(layout)}
        data-type="columns"
        data-layout={layout}
      >
        <div className={COLUMNS_GRID_CLASS}>
          {renderChildren(node, key, ctx)}
        </div>
      </div>
    );
  }
  if (node.type === "column") {
    return (
      <div key={key} className={COLUMN_CLASS} data-type="column">
        {renderChildren(node, key, ctx)}
      </div>
    );
  }
  if (node.type === "details") {
    return (
      <details key={key} className={DETAILS_CLASS}>
        {renderChildren(node, key, ctx)}
      </details>
    );
  }
  if (node.type === "detailsSummary") {
    return (
      <summary
        key={key}
        className={DETAILS_SUMMARY_CLASS}
        dangerouslySetInnerHTML={{ __html: renderSummaryHtml(node) }}
      />
    );
  }
  if (node.type === "detailsContent") {
    return (
      <div
        key={key}
        className={DETAILS_CONTENT_CLASS}
        data-type={DETAILS_CONTENT_DATA_TYPE}
      >
        {renderChildren(node, key, ctx)}
      </div>
    );
  }

  if (isGalleryNode(node) && node.attrs.galleryId) {
    return (
      <GalleryBlock
        key={`gallery-${node.attrs.galleryId}-${key}`}
        galleryId={String(node.attrs.galleryId)}
      />
    );
  }
  // A placeholder saved before anything was chosen has nothing to render;
  // skip it instead of emitting an empty wrapper div.
  if (isQuoteCalculatorNode(node) && !node.attrs.calculatorId) return null;
  if (isFormNode(node) && !node.attrs.formId) return null;
  if (isQuoteCalculatorNode(node) && node.attrs.calculatorId) {
    return (
      <QuoteCalculatorBlock
        key={`quote-${node.attrs.calculatorId}-${key}`}
        calculatorId={String(node.attrs.calculatorId)}
        width={coerceQuoteWidth(node.attrs.width)}
        height={coerceQuoteHeight(node.attrs.height)}
        density={coerceQuoteDensity(node.attrs.density)}
        layout={coerceQuoteLayout(node.attrs.layout)}
      />
    );
  }
  if (isFormNode(node) && node.attrs.formId) {
    return (
      <FormBlock
        key={`form-${node.attrs.formId}-${key}`}
        formId={String(node.attrs.formId)}
      />
    );
  }
  if (isEmbedNode(node) && node.attrs.src) {
    const src = String(node.attrs.src);
    const height = node.attrs.height ? Number(node.attrs.height) : undefined;
    const title = typeof node.attrs.title === "string" ? node.attrs.title : "";
    const aspectRatio =
      typeof node.attrs.aspectRatio === "string"
        ? node.attrs.aspectRatio
        : undefined;
    const maxWidth =
      typeof node.attrs.maxWidth === "string" ? node.attrs.maxWidth : undefined;
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
    if (!ctx.embedsEnabled) {
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
            key={`embed-${key}`}
            className="border-input bg-muted text-muted-foreground my-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            {linkLabel}
          </span>
        );
      }
      return (
        <a
          key={`embed-${key}`}
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
          key={`embed-${key}`}
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
        key={`embed-${key}`}
        src={src}
        height={height}
        title={title}
        aspectRatio={aspectRatio}
        maxWidth={maxWidth}
      />
    );
  }
  if (isVideoNode(node) && node.attrs.src) {
    return (
      <RichTextVideo
        key={`video-${key}`}
        src={node.attrs.src}
        title={node.attrs.title}
        ambient={node.attrs.ambient}
      />
    );
  }
  return renderLeafHtml(node, key);
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

    // The editor shows a blank line (empty paragraph, trailing Shift+Enter)
    // through ProseMirror's trailing `<br>`; `generateHTML` emits `<p></p>`,
    // which is zero tall and lets template margins collapse through it. Pad
    // those with a real `<br>` (and drop TrailingNode's invisible end
    // paragraph) so the storefront keeps the owner's spacing.
    const doc = preserveBlankLines(sanitized);

    const ctx: RenderContext = { embedsEnabled };
    return doc.content.map((node, index) =>
      renderBlock(node, String(index), ctx),
    );
  }, [content, embedsEnabled]);

  return <div className={className}>{elements}</div>;
}
