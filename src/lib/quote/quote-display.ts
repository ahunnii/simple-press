/**
 * Isomorphic quote-calculator display utilities — safe to run on server and
 * client. No DOM APIs used. Mirrors `~/lib/embed.ts` (value unions, ordered
 * `{ value, label }` preset arrays, non-throwing `coerce*` narrowing).
 *
 * These are the Width / Height / Density / Layout node attrs
 * (`data-quote-width`, `data-quote-height`, `data-quote-density`,
 * `data-quote-layout`) set on the `quoteCalculator` tiptap node — see
 * `~/components/ui/minimal-tiptap/extensions/quote-calculator/quote-calculator-node-view.tsx`
 * for the picker UI. `~/components/tiptap-renderer.tsx` reads the attrs off
 * the stored node and passes them to `~/components/quote/quote-calculator-block.tsx`,
 * which applies the width/layout classes to its wrapper and forwards
 * height/density to `QuoteCalculatorRunner`. `layout` is an embed-level tiptap
 * attr only — it never touches the calculator `definition`, tRPC, or the DB.
 *
 * Every Tailwind class below is a literal string (never built via template
 * interpolation) so Tailwind's content scanner can see it in this file.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Named max-width presets for the quote calculator embed. */
export type QuoteWidth = "full" | "large" | "medium" | "small";

/** Named min-height presets for the quote calculator embed. */
export type QuoteHeight = "auto" | "short" | "medium" | "tall";

/** Named spacing/typography density presets for the quote calculator embed. */
export type QuoteDensity = "compact" | "comfortable" | "spacious";

/** Named layout presets for the quote calculator embed. */
export type QuoteLayout = "inline" | "centered";

/** Defaults that reproduce today's (pre-sizing) look exactly. */
export const QUOTE_DISPLAY_DEFAULTS = {
  width: "full",
  height: "auto",
  density: "comfortable",
  layout: "inline",
} as const satisfies {
  width: QuoteWidth;
  height: QuoteHeight;
  density: QuoteDensity;
  layout: QuoteLayout;
};

// ---------------------------------------------------------------------------
// Ordered presets — for <Select> menus in the node view.
// ---------------------------------------------------------------------------

/** Ordered options for the Width select. */
export const QUOTE_WIDTH_PRESETS: ReadonlyArray<{
  value: QuoteWidth;
  label: string;
}> = [
  { value: "full", label: "Full width (default)" },
  { value: "large", label: "Large" },
  { value: "medium", label: "Medium" },
  { value: "small", label: "Small" },
] as const;

/** Ordered options for the Height select. */
export const QUOTE_HEIGHT_PRESETS: ReadonlyArray<{
  value: QuoteHeight;
  label: string;
}> = [
  { value: "auto", label: "Auto (default)" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "tall", label: "Tall" },
] as const;

/** Ordered options for the Density select. */
export const QUOTE_DENSITY_PRESETS: ReadonlyArray<{
  value: QuoteDensity;
  label: string;
}> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable (default)" },
  { value: "spacious", label: "Spacious" },
] as const;

/** Ordered options for the Layout select. */
export const QUOTE_LAYOUT_PRESETS: ReadonlyArray<{
  value: QuoteLayout;
  label: string;
}> = [
  { value: "inline", label: "Inline (default)" },
  { value: "centered", label: "Centered on page" },
] as const;

// ---------------------------------------------------------------------------
// Class mappers
// ---------------------------------------------------------------------------

/**
 * Returns the Tailwind `max-w-*` class for the given width preset.
 * Returns `""` for `"full"`, `undefined`, or unrecognised values.
 */
export function quoteWidthClass(value?: string): string {
  switch (value) {
    case "large":
      return "max-w-4xl";
    case "medium":
      return "max-w-2xl";
    case "small":
      return "max-w-md";
    default:
      return "";
  }
}

/**
 * Returns the Tailwind `min-h-*` class for the given height preset.
 * Returns `""` for `"auto"`, `undefined`, or unrecognised values.
 */
export function quoteHeightClass(value?: string): string {
  switch (value) {
    case "short":
      return "min-h-[22rem]";
    case "medium":
      return "min-h-[30rem]";
    case "tall":
      return "min-h-[38rem]";
    default:
      return "";
  }
}

/**
 * Returns the Tailwind layout classes for the given layout preset.
 * Returns `""` for `"inline"`, `undefined`, or unrecognised values.
 *
 * `"centered"` only sets `justify-center` — never `items-center`. This is a
 * flex COLUMN wrapper, so `justify-*` controls the cross axis (vertical) and
 * the inner width div is a block-level flex child that stretches to fill the
 * row; its own `mx-auto` (added alongside `quoteWidthClass`, see
 * `quote-calculator-block.tsx`) is what centers it horizontally.
 * `items-center` would instead shrink-to-fit the child to its content width,
 * fighting the width preset.
 *
 * The `min-h-[70vh]` applies to the OUTER wrapper (the whole embed, so a
 * short calculator still centers within the viewport) and composes with —
 * does not replace — the height presets' `min-h-*` on the runner card itself
 * (`quoteHeightClass`, applied inside `QuoteCalculatorRunner`).
 */
export function quoteLayoutClass(value?: string): string {
  switch (value) {
    case "centered":
      return "flex min-h-[70vh] flex-col justify-center";
    default:
      return "";
  }
}

/** Grouped spacing/typography classes for one density preset. */
export type QuoteDensityClasses = {
  card: string;
  heading: string;
  body: string;
  optionCard: string;
  optionGap: string;
  fieldGap: string;
};

/**
 * Returns the spacing/typography classes for the given density preset.
 * `"comfortable"`, `undefined`, and unrecognised values all resolve to
 * TODAY's literals (from `quote-calculator-runner.tsx` +
 * `quote-question-field.tsx`) — enabling this feature must not change the
 * look of any calculator that never touches the Density control.
 */
export function quoteDensityClasses(value?: string): QuoteDensityClasses {
  switch (value) {
    case "compact":
      return {
        card: "p-3 sm:p-4",
        heading: "text-base sm:text-lg",
        body: "space-y-3",
        optionCard: "p-3",
        optionGap: "gap-2",
        fieldGap: "gap-3",
      };
    case "spacious":
      return {
        card: "p-6 sm:p-10",
        heading: "text-xl sm:text-2xl",
        body: "space-y-6",
        optionCard: "p-5",
        optionGap: "gap-4",
        fieldGap: "gap-5",
      };
    case "comfortable":
    default:
      return {
        card: "p-4 sm:p-6",
        heading: "text-lg sm:text-xl",
        body: "space-y-4",
        optionCard: "p-4",
        optionGap: "gap-3",
        fieldGap: "gap-4",
      };
  }
}

// ---------------------------------------------------------------------------
// Coerce helpers — validate and narrow unknown values to the named unions.
// These are intentionally non-throwing: return undefined for invalid input.
// ---------------------------------------------------------------------------

/** Returns a valid `QuoteWidth` or `undefined`. */
export function coerceQuoteWidth(v: unknown): QuoteWidth | undefined {
  if (v === "full" || v === "large" || v === "medium" || v === "small") {
    return v;
  }
  return undefined;
}

/** Returns a valid `QuoteHeight` or `undefined`. */
export function coerceQuoteHeight(v: unknown): QuoteHeight | undefined {
  if (v === "auto" || v === "short" || v === "medium" || v === "tall") {
    return v;
  }
  return undefined;
}

/** Returns a valid `QuoteDensity` or `undefined`. */
export function coerceQuoteDensity(v: unknown): QuoteDensity | undefined {
  if (v === "compact" || v === "comfortable" || v === "spacious") {
    return v;
  }
  return undefined;
}

/** Returns a valid `QuoteLayout` or `undefined`. */
export function coerceQuoteLayout(v: unknown): QuoteLayout | undefined {
  if (v === "inline" || v === "centered") {
    return v;
  }
  return undefined;
}
