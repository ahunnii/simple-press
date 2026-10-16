/**
 * Per-page width for custom CMS pages (admin → Pages → "Page width").
 *
 * Stored in the otherwise-unused `Page.template` column: `"full-width"` means
 * Wide; every other value (`"default"`, legacy `"sidebar"`, null) is Standard.
 *
 * Contract every template's `GenericPage` follows:
 *   - Standard — the template's own reading column, exactly as it always was.
 *   - Wide     — the template's standard content container. Direct-child text
 *                blocks of the rich-text body stay capped at
 *                `--sp-prose-measure` (via `.sp-prose-wide`, see globals.css),
 *                while rows (columns), media, tables, forms and galleries
 *                span the container. Centred-hero templates also add
 *                `--centered` so the capped text stays centred.
 */

export type PageWidth = "standard" | "wide";

export function getPageWidth(page: { template?: string | null }): PageWidth {
  return page.template === "full-width" ? "wide" : "standard";
}

/** Add to the `TiptapRenderer` className when the page is Wide. */
export const PROSE_WIDE_CLASS = "sp-prose-wide";

/** Same, for templates with a centred hero (capped text stays centred). */
export const PROSE_WIDE_CENTERED_CLASS =
  "sp-prose-wide sp-prose-wide--centered";
