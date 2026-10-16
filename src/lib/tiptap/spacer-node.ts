import { mergeAttributes, Node } from "@tiptap/core";

/**
 * Shared `spacer` node definition: deliberate vertical space between blocks
 * in custom pages, blog posts and other rich text.
 *
 * This module must stay free of React, tRPC and `server-only` — it is
 * imported by every half of the render pipeline:
 *  - `RENDERER_BASE_EXTENSIONS` (`~/lib/tiptap/renderer-extensions`), the
 *    storefront's client/server-shared schema source; `TiptapRenderer`
 *    renders a spacer like any other leaf block (through `renderHTML`);
 *  - the WordPress / site export (`~/lib/wordpress/tiptap-to-html`), which
 *    builds the markup by hand from the helpers below and adds an inline
 *    `height` (`SPACER_EXPORT_HEIGHT`) so the gap survives outside our CSS;
 *  - the admin editor, which `.extend()`s `Spacer` with its insert / resize /
 *    remove commands. No commands live here.
 *
 * Markup (`renderHTML`):
 *
 *   <div class="sp-spacer sp-spacer--{size}" data-type="spacer" data-size="{size}" aria-hidden="true"></div>
 *
 * Heights come from the shared `.sp-spacer--{size}` rules in globals.css
 * (overridable per template via `--sp-spacer-sm|md|lg`). The element is
 * empty and `aria-hidden`: it is layout only, never content.
 */

/** Every height a spacer may take. */
export const SPACER_SIZES = ["sm", "md", "lg"] as const;

export type SpacerSize = (typeof SPACER_SIZES)[number];

export const DEFAULT_SPACER_SIZE: SpacerSize = "md";

/** The spacer element. The size modifier is appended by `spacerClassName`. */
export const SPACER_CLASS = "sp-spacer";

/** Owner-facing name of each size (editor bubble menu). */
export const SPACER_SIZE_LABEL: Readonly<Record<SpacerSize, string>> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

/**
 * Inline heights for the site export, where our stylesheet doesn't travel.
 * Same values as the globals.css defaults.
 */
export const SPACER_EXPORT_HEIGHT: Readonly<Record<SpacerSize, string>> = {
  sm: "1.5rem",
  md: "3rem",
  lg: "clamp(3.5rem, 9vw, 6rem)",
};

const SIZE_SET: ReadonlySet<string> = new Set(SPACER_SIZES);

/**
 * Narrows any stored/parsed value to a known size, falling back to the
 * default. Every place a size reaches markup goes through this, so a
 * hand-edited `size` can never inject an arbitrary class.
 */
export function coerceSpacerSize(value: unknown): SpacerSize {
  return typeof value === "string" && SIZE_SET.has(value)
    ? (value as SpacerSize)
    : DEFAULT_SPACER_SIZE;
}

/** `class` for the spacer element, e.g. `"sp-spacer sp-spacer--lg"`. */
export function spacerClassName(size: SpacerSize): string {
  return `${SPACER_CLASS} ${SPACER_CLASS}--${size}`;
}

export interface SpacerNodeAttrs {
  size: SpacerSize;
}

export interface SpacerOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Spacer = Node.create<SpacerOptions>({
  name: "spacer",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      size: {
        default: DEFAULT_SPACER_SIZE,
        parseHTML: (element) =>
          coerceSpacerSize(element.getAttribute("data-size")),
        // The node-level `renderHTML` below emits `data-size` and the size
        // class by hand from the coerced value, so the raw attr must never
        // surface on its own.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spacer"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const size = coerceSpacerSize(
      (node.attrs as Partial<SpacerNodeAttrs>).size,
    );
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: spacerClassName(size),
        "data-type": this.name,
        "data-size": size,
        "aria-hidden": "true",
      }),
    ];
  },
});
