import type {
  ProductCustomizerClassNames,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer/product-customizer";

/**
 * Animated-bamboo styling for the shared product customizer, applied through
 * the component's per-slot `classNames` (no global CSS). Mirrors the template's
 * variant pills (`.bamboo-pill-radio`): roll-white faces, 2px outline border,
 * pine when chosen, pill-shaped chips, Bricolage heading face on legends.
 *
 * Contrast (on roll white / cream): pine and ink >= 7:1, `--bamboo-muted`
 * ~5.5:1, `--bamboo-terracotta-deep` ~6.4:1 for the error text.
 */
export const BAMBOO_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  group:
    "data-[invalid=true]:border-l-4 data-[invalid=true]:border-[var(--bamboo-terracotta-deep)] data-[invalid=true]:pl-3",
  legend: "font-heading text-[1.02rem] font-semibold text-[var(--bamboo-pine)]",
  help: "text-[0.9rem] text-[var(--bamboo-ink-soft)]",
  count: "text-[0.86rem] text-[var(--bamboo-muted)]",
  value:
    "group/val rounded-[20px] border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] text-[var(--bamboo-ink)] transition-[border-color,background-color] duration-200 hover:border-[var(--bamboo-sage-deep)] hover:bg-[var(--bamboo-roll)] data-[selected=true]:border-[var(--bamboo-pine)] data-[selected=true]:bg-[var(--bamboo-cream)] data-[selected=true]:ring-[var(--bamboo-pine)] has-[:focus-visible]:outline-[var(--bamboo-pine)]",
  valueImage: "rounded-2xl",
  swatch: "border-[var(--bamboo-outline)]",
  valueLabel: "font-medium text-[var(--bamboo-ink)]",
  valuePrice:
    "rounded-full px-2 py-px text-[0.78rem] font-semibold text-[var(--bamboo-pine)] group-data-[included=true]/val:bg-[var(--bamboo-pine)] group-data-[included=true]/val:text-[var(--bamboo-cream)]",
  clear:
    "text-[var(--bamboo-pine)] hover:text-[var(--bamboo-pine-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bamboo-pine)]",
  textInput:
    "h-12 rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] px-4 focus-visible:border-[var(--bamboo-pine)] focus-visible:ring-[var(--bamboo-pine)]/30",
  textCounter: "text-[var(--bamboo-muted)]",
  limit: "text-[var(--bamboo-pine)]",
  error: "font-medium text-[var(--bamboo-terracotta-deep)]",
};

export const BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES: ProductCustomizerTrayClassNames =
  {
    root: "rounded-[20px] border-2 border-dashed border-[var(--bamboo-outline)] bg-[var(--bamboo-cream)] p-3",
    item: "border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] font-medium text-[var(--bamboo-pine)]",
  };
