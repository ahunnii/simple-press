import type {
  ProductCustomizerClassNames,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer/product-customizer";

/**
 * Bamboo styling for the shared product customizer, applied through the
 * component's per-slot `classNames` (no global CSS, so nothing here can leak
 * outside the buy box). Colors are the `.bamboo` tokens (`--bam-*`), which
 * the theme presets recompute, so a preset restyles the options for free.
 *
 * Contrast: forest on cream/cream-deep is well over AA; the error red is
 * darker than `--destructive` (≈4:1 on cream) to clear 4.5:1 for small text.
 * `--bam-gold` is large-text-only, so it is never used on the small labels.
 */
const ERROR_RED = "text-[oklch(0.45_0.15_30)]";

export const BAMBOO_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  group:
    "data-[invalid=true]:border-l-2 data-[invalid=true]:border-[oklch(0.45_0.15_30)] data-[invalid=true]:pl-3",
  legend: "text-base font-semibold tracking-tight text-foreground",
  help: "text-muted-foreground",
  count: "text-muted-foreground",
  value:
    "group/val rounded-xl border-[var(--bam-hairline)] bg-background shadow-none hover:bg-[var(--bam-cream-deep)] data-[selected=true]:bg-[var(--bam-cream-deep)] has-[:focus-visible]:outline-[var(--ring)]",
  valueImage: "rounded-lg",
  valueLabel: "font-medium text-foreground",
  valuePrice:
    "rounded-full px-1.5 py-px text-[11px] font-semibold text-[var(--bam-forest)] group-data-[included=true]/val:bg-[var(--bam-forest)] group-data-[included=true]/val:text-[var(--bam-cream)]",
  clear:
    "text-[var(--bam-forest)] decoration-[var(--bam-hairline)] hover:text-[var(--bam-forest-deep)] focus-visible:outline-[var(--ring)]",
  textInput:
    "h-11 rounded-lg border-[var(--bam-hairline)] bg-background focus-visible:border-[var(--bam-forest)] focus-visible:ring-[var(--ring)]/40",
  textCounter: "text-muted-foreground",
  limit: "text-[var(--bam-forest)]",
  error: `${ERROR_RED} font-medium`,
};

export const BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES: ProductCustomizerTrayClassNames =
  {
    root: "rounded-xl border border-dashed border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)]/60 p-3",
    item: "border-[var(--bam-hairline)] bg-background font-medium text-[var(--bam-forest)]",
  };
