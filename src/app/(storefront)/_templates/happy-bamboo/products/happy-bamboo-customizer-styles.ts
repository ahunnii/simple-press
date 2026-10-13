import type {
  ProductCustomizerClassNames,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer/product-customizer";

/**
 * Happy-bamboo styling for the shared product customizer, applied through the
 * component's per-slot `classNames` (no global CSS). The template is themed
 * entirely through shadcn tokens (`--primary`, `--border`, `--muted`, ...,
 * with a `.dark` set), so these classes stay on tokens: palette presets and
 * dark mode restyle the options with no extra rules.
 *
 * Contrast: option labels and prices use `foreground`; `primary` is used only
 * as a fill/border (chosen tile, "Included" chip with `primary-foreground`),
 * never as small text, because it isn't text-grade on the dark surface.
 */
export const HAPPY_BAMBOO_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  group:
    "data-[invalid=true]:border-l-2 data-[invalid=true]:border-destructive data-[invalid=true]:pl-3",
  legend: "text-sm font-semibold text-foreground",
  value:
    "group/val rounded-lg border-border bg-background hover:bg-secondary/60 data-[selected=true]:bg-primary/10",
  valueImage: "rounded-md",
  valueLabel: "font-medium text-foreground",
  valuePrice:
    "rounded-full px-1.5 py-px font-medium text-foreground group-data-[included=true]/val:bg-primary group-data-[included=true]/val:text-primary-foreground",
  clear: "text-foreground focus-visible:outline-ring",
  textInput: "h-11 rounded-lg border-border",
  error: "font-medium",
};

export const HAPPY_BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES: ProductCustomizerTrayClassNames =
  {
    root: "rounded-lg border border-dashed border-border bg-secondary/40 p-3",
    item: "border-border bg-background font-medium text-foreground",
  };
