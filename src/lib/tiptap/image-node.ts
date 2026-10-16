import type { Attribute } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

/**
 * Shared rich-text image layout: a `size` preset (a share of the containing
 * column) and an `align`ment, on top of the stock image node.
 *
 * This module must stay free of React, tRPC and `server-only` — it feeds
 * `RENDERER_BASE_EXTENSIONS` (the storefront renderer, the sanitizer's
 * schema-derived allowlist and the WordPress / site export) and the admin
 * editor's image extension, which reuses `IMAGE_LAYOUT_ATTRIBUTES` and
 * `renderImageHTML` so editor HTML and storefront HTML can't drift.
 *
 * Markup for an image with a layout:
 *
 *   <img src="…" data-size="medium" data-align="center"
 *        style="width: 50%; height: auto; display: block; margin-left: auto; margin-right: auto">
 *
 * The inline style is what makes the layout win over template rules such as
 * bamboo/olive `.x-prose img { width: 100% }` without touching any template
 * CSS. Only horizontal margins are emitted, so a template's vertical rhythm
 * (`margin: 2em 0`) is kept.
 *
 * Legacy images (a pixel `width`/`height` from the old resize handles, no
 * `size`) render exactly as before: stock `width`/`height` attributes and no
 * style — except the old editor's accidental 120px default, which renders
 * unsized (see `isBuggedLegacyImageWidth`). Setting a `size` in the editor
 * clears the pixel pair.
 */

/** Size presets, as a share of the containing column. */
export const IMAGE_SIZES = ["small", "medium", "large", "full"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const IMAGE_SIZE_PERCENT: Readonly<Record<ImageSize, number>> = {
  small: 25,
  medium: 50,
  large: 75,
  full: 100,
};

export const IMAGE_SIZE_LABEL: Readonly<Record<ImageSize, string>> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  full: "Full width",
};

export const IMAGE_ALIGNS = ["left", "center", "right"] as const;
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

/** What new inserts get, so they look the same on every template. */
export const DEFAULT_NEW_IMAGE_LAYOUT = {
  size: "full",
  align: "center",
} as const satisfies { size: ImageSize; align: ImageAlign };

const SIZE_SET: ReadonlySet<string> = new Set(IMAGE_SIZES);
const ALIGN_SET: ReadonlySet<string> = new Set(IMAGE_ALIGNS);

/** A known size preset, or `null` (legacy / unset). Never throws. */
export function coerceImageSize(value: unknown): ImageSize | null {
  return typeof value === "string" && SIZE_SET.has(value)
    ? (value as ImageSize)
    : null;
}

/** A known alignment, or `null` (template default). Never throws. */
export function coerceImageAlign(value: unknown): ImageAlign | null {
  return typeof value === "string" && ALIGN_SET.has(value)
    ? (value as ImageAlign)
    : null;
}

/** The preset whose width is closest to `percent` (0–100+) of the column. */
export function nearestImageSize(percent: number): ImageSize {
  let best: ImageSize = "full";
  let bestDistance = Infinity;
  for (const size of IMAGE_SIZES) {
    const distance = Math.abs(IMAGE_SIZE_PERCENT[size] - percent);
    if (distance < bestDistance) {
      best = size;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The old editor saved every newly inserted image as `width: 120` (its
 * resize hook started at the 120px minimum and the load handler wrote that
 * back, plus the matching height). Owners never chose it, so a legacy image
 * with exactly that width and no `size` is treated as unsized: natural size,
 * capped by the column. Render-time only — stored JSON is left alone.
 */
export const BUGGED_LEGACY_IMAGE_WIDTH = 120;

/** True when a legacy pixel width is the old editor's accidental 120px. */
export function isBuggedLegacyImageWidth(width: unknown): boolean {
  return Number(width) === BUGGED_LEGACY_IMAGE_WIDTH;
}

const ALIGN_MARGINS: Readonly<Record<ImageAlign, string>> = {
  left: "margin-left: 0; margin-right: auto",
  center: "margin-left: auto; margin-right: auto",
  right: "margin-left: auto; margin-right: 0",
};

/**
 * The inline style for a size/align pair, or `null` when neither is set (a
 * legacy image keeps rendering with no style at all). Values are coerced
 * first, so a hand-edited attr can never reach the style string.
 */
export function imageLayoutStyle(size: unknown, align: unknown): string | null {
  const s = coerceImageSize(size);
  const a = coerceImageAlign(align);
  if (!s && !a) return null;
  const parts: string[] = [];
  if (s) parts.push(`width: ${IMAGE_SIZE_PERCENT[s]}%`, "height: auto");
  if (a) parts.push("display: block", ALIGN_MARGINS[a]);
  return parts.join("; ");
}

/**
 * `size` / `align` attribute specs. Their own `renderHTML` emits nothing:
 * `renderImageHTML` builds the data attrs and the style together from the
 * node, so the pair is coerced once and emitted in a fixed order.
 */
export const IMAGE_LAYOUT_ATTRIBUTES: Record<"size" | "align", Attribute> = {
  size: {
    default: null,
    parseHTML: (element) => coerceImageSize(element.getAttribute("data-size")),
    renderHTML: () => ({}),
  },
  align: {
    default: null,
    parseHTML: (element) =>
      coerceImageAlign(element.getAttribute("data-align")),
    renderHTML: () => ({}),
  },
};

/**
 * `renderHTML` for any image node carrying `IMAGE_LAYOUT_ATTRIBUTES`.
 * `HTMLAttributes` are the per-attribute rendered attrs (src/alt/title/
 * width/height…). When a `size` is set the pixel pair is dropped, in case a
 * stale one survived in the JSON.
 */
export function renderImageHTML(
  nodeAttrs: Record<string, unknown>,
  extensionAttributes: Record<string, unknown>,
  HTMLAttributes: Record<string, unknown>,
): ["img", Record<string, unknown>] {
  const size = coerceImageSize(nodeAttrs.size);
  const align = coerceImageAlign(nodeAttrs.align);
  const attrs: Record<string, unknown> = { ...HTMLAttributes };
  if (size || isBuggedLegacyImageWidth(nodeAttrs.width)) {
    delete attrs.width;
    delete attrs.height;
  }
  const layout: Record<string, string> = {};
  if (size) layout["data-size"] = size;
  if (align) layout["data-align"] = align;
  const style = imageLayoutStyle(size, align);
  if (style) layout.style = style;
  return ["img", mergeAttributes(extensionAttributes, attrs, layout)];
}

/**
 * The storefront / export image node: stock image + size/align. Replaces the
 * stock `Image` in `RENDERER_BASE_EXTENSIONS`, which also puts `size` and
 * `align` on the sanitizer's allowlist.
 */
export const RendererImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...IMAGE_LAYOUT_ATTRIBUTES,
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return renderImageHTML(
      node.attrs,
      this.options.HTMLAttributes,
      HTMLAttributes,
    );
  },
});
