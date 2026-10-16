import { mergeAttributes, Node } from "@tiptap/core";

/**
 * Shared `columns` / `column` node definitions: a row of side-by-side
 * columns in custom pages, blog posts and other rich text.
 *
 * This module must stay free of React, tRPC and `server-only` — it is
 * imported by every half of the render pipeline:
 *  - `RENDERER_BASE_EXTENSIONS` (`~/lib/tiptap/renderer-extensions`), the
 *    storefront's client/server-shared schema source, which the WordPress /
 *    site export (`~/lib/wordpress/tiptap-to-html`) also renders with;
 *  - `TiptapRenderer` and the exporter, which build the container markup by
 *    hand (so galleries/forms nested in a column stay live) from the class
 *    helpers below — the same ones `renderHTML` uses, so the two can't drift;
 *  - the admin editor, which `.extend()`s `Columns` with its insert/layout
 *    commands. No commands live here.
 *
 * Markup (both `renderHTML` and the hand-built shells):
 *
 *   <div class="sp-columns sp-columns--{layout}" data-type="columns" data-layout="{layout}">
 *     <div class="sp-columns__grid">
 *       <div class="sp-column" data-type="column">…blocks…</div>
 *       …
 *     </div>
 *   </div>
 *
 * The inner grid wrapper exists so the outer div can be a CSS query
 * container: a container can't style itself from its own query.
 */

/** Every layout a row may take. Equal 2/3/4 columns, plus uneven ⅓–⅔ and ⅔–⅓. */
export const COLUMN_LAYOUTS = ["2", "3", "4", "1-2", "2-1"] as const;

export type ColumnLayout = (typeof COLUMN_LAYOUTS)[number];

export const DEFAULT_COLUMN_LAYOUT: ColumnLayout = "2";

/** Outer row element (the query container). The layout modifier is appended by `columnsClassName`. */
export const COLUMNS_CLASS = "sp-columns";

/** Grid wrapper directly inside the row; the columns are its children. */
export const COLUMNS_GRID_CLASS = "sp-columns__grid";

/** One column. */
export const COLUMN_CLASS = "sp-column";

const LAYOUT_SET: ReadonlySet<string> = new Set(COLUMN_LAYOUTS);

/**
 * Narrows any stored/parsed value to a known layout, falling back to the
 * default. Every place a layout reaches markup goes through this, so a
 * hand-edited `layout` can never inject an arbitrary class.
 */
export function coerceColumnLayout(value: unknown): ColumnLayout {
  return typeof value === "string" && LAYOUT_SET.has(value)
    ? (value as ColumnLayout)
    : DEFAULT_COLUMN_LAYOUT;
}

const COLUMN_COUNT: Readonly<Record<ColumnLayout, number>> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "1-2": 2,
  "2-1": 2,
};

/** How many `column` children a row of this layout holds. */
export function columnCountForLayout(layout: ColumnLayout): number {
  return COLUMN_COUNT[layout];
}

/** `class` for the outer row element, e.g. `"sp-columns sp-columns--1-2"`. */
export function columnsClassName(layout: ColumnLayout): string {
  return `${COLUMNS_CLASS} ${COLUMNS_CLASS}--${layout}`;
}

export interface ColumnsNodeAttrs {
  layout: ColumnLayout;
}

export interface ColumnsOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Columns = Node.create<ColumnsOptions>({
  name: "columns",

  group: "block",

  content: "column+",

  isolating: true,

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      layout: {
        default: DEFAULT_COLUMN_LAYOUT,
        parseHTML: (element) =>
          coerceColumnLayout(element.getAttribute("data-layout")),
        // The node-level `renderHTML` below emits `data-layout` and the
        // layout class by hand from the coerced value, so the raw attr must
        // never surface on its own.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="columns"]',
        contentElement: `.${COLUMNS_GRID_CLASS}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const layout = coerceColumnLayout(
      (node.attrs as Partial<ColumnsNodeAttrs>).layout,
    );
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: columnsClassName(layout),
        "data-type": this.name,
        "data-layout": layout,
      }),
      ["div", { class: COLUMNS_GRID_CLASS }, 0],
    ];
  },
});

export interface ColumnOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Column = Node.create<ColumnOptions>({
  name: "column",

  content: "block+",

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: COLUMN_CLASS,
        "data-type": this.name,
      }),
      0,
    ];
  },
});
