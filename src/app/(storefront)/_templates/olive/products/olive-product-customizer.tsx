"use client";

import type { CSSProperties } from "react";

import type {
  ProductCustomizerClassNames,
  ProductCustomizerController,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer";
import { ProductCustomizer } from "~/components/customizer";

/**
 * Product options (the shared customizer) in olive's language: square
 * choices with an espresso ring and a sand face when chosen, `olive-label` legends,
 * `olive-caption` helper lines, and the template's own `olive-input` for the
 * engraving field.
 *
 * Olive never remaps the shadcn tokens globally (see `.olive
 * .olive-subscribe-panel`), so the wrapper remaps only the ones the shared
 * renderer reads, scoped to this subtree. The renderer's swatches come from
 * the owner's `swatchColor`; they are NOT routed through `shared/olive-color`
 * (that map is for variant colour names).
 *
 * Form controls only: this component is rendered outside any reveal wrapper
 * (a transform on an ancestor can swallow a click mid-animation).
 */
const OLIVE_CUSTOMIZER_TOKENS = {
  "--primary": "var(--olive-espresso)",
  "--primary-foreground": "var(--olive-on-dark)",
  "--input": "var(--olive-control-border)",
  "--border": "var(--olive-hairline)",
  "--background": "var(--olive-ivory)",
  "--foreground": "var(--olive-espresso)",
  "--muted": "var(--olive-sand)",
  "--muted-foreground": "var(--olive-ink-soft)",
  "--destructive": "var(--olive-error)",
  "--ring": "var(--olive-espresso)",
  "--radius": "var(--olive-card-radius)",
} as CSSProperties;

const OLIVE_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  legend: "olive-label",
  help: "olive-caption",
  count: "olive-caption",
  value:
    "rounded-none hover:bg-[var(--olive-sand)] data-[selected=true]:bg-[var(--olive-sand)] data-[selected=true]:text-[var(--olive-espresso)] has-[:focus-visible]:outline-[var(--olive-espresso)]",
  valueImage: "rounded-none",
  valueLabel: "olive-caption",
  valuePrice: "olive-caption",
  clear:
    "olive-caption self-start underline underline-offset-2 hover:text-[var(--olive-espresso)]",
  textInput: "olive-input h-auto",
  textCounter: "olive-caption",
  limit: "olive-caption",
  error: "text-[0.8125rem] text-[var(--olive-error)]",
};

const OLIVE_CUSTOMIZER_TRAY: ProductCustomizerTrayClassNames = {
  item: "olive-caption border-[var(--olive-hairline)] bg-[var(--olive-sand)] text-[var(--olive-espresso)]",
};

export function OliveProductCustomizer({
  controller,
}: {
  controller: ProductCustomizerController;
}) {
  if (!controller.enabled) return null;
  return (
    <div className="olive-customizer" style={OLIVE_CUSTOMIZER_TOKENS}>
      <ProductCustomizer
        controller={controller}
        classNames={OLIVE_CUSTOMIZER_CLASSNAMES}
        trayClassNames={OLIVE_CUSTOMIZER_TRAY}
      />
    </div>
  );
}
