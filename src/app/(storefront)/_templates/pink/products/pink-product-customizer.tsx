"use client";

import type { CSSProperties } from "react";

import type {
  ProductCustomizerClassNames,
  ProductCustomizerController,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer";
import { ProductCustomizer } from "~/components/customizer";

/**
 * Product options (the shared customizer) for pink: square, ink-ruled tiles
 * like the variant pills, an ink-ringed selected state (ink border + ring on a
 * pale pink wash, so the choice never leans on hue alone), `pink-label`
 * legends and the template's `pink-input` for the engraving field.
 *
 * Pink does not remap the shadcn tokens globally (see `.pink
 * .pink-subscribe-panel`), so the wrapper remaps only the ones the shared
 * renderer reads, scoped to this subtree. `--input` is pink's interactive
 * boundary grey (3.36:1 on white, WCAG 1.4.11).
 */
const PINK_CUSTOMIZER_TOKENS = {
  "--primary": "var(--pink-ink)",
  "--primary-foreground": "var(--pink-paper)",
  "--input": "var(--pink-line-strong)",
  "--border": "var(--pink-line)",
  "--background": "var(--pink-white)",
  "--foreground": "var(--pink-ink)",
  "--muted": "var(--pink-panel)",
  "--muted-foreground": "var(--pink-subtle)",
  "--destructive": "var(--pink-error)",
  "--ring": "var(--pink-rose)",
  "--radius": "0px",
} as CSSProperties;

const PINK_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  legend: "pink-label",
  help: "text-[14px] text-[var(--pink-muted)]",
  count: "text-[13px] text-[var(--pink-subtle)]",
  value:
    "rounded-none text-[14px] hover:bg-[var(--pink-panel)] data-[selected=true]:bg-[var(--pink-panel)] has-[:focus-visible]:outline-[var(--pink-rose)]",
  valueImage: "rounded-none",
  valueLabel: "font-medium",
  valuePrice: "text-[13px] text-[var(--pink-subtle)]",
  clear:
    "text-[13px] text-[var(--pink-muted)] underline underline-offset-2 hover:text-[var(--pink-ink)] self-start",
  textInput: "pink-input h-auto rounded-none",
  textCounter: "text-[13px] text-[var(--pink-subtle)]",
  limit: "text-[13px] text-[var(--pink-subtle)]",
  error: "text-[14px] text-[var(--pink-error)]",
};

const PINK_CUSTOMIZER_TRAY: ProductCustomizerTrayClassNames = {
  item: "rounded-none border-[var(--pink-line-strong)] bg-[var(--pink-white)] text-[13px] text-[var(--pink-ink)]",
  image: "rounded-none",
  swatch: "rounded-none",
};

export function PinkProductCustomizer({
  controller,
}: {
  controller: ProductCustomizerController;
}) {
  if (!controller.enabled) return null;
  return (
    <div className="pink-customizer" style={PINK_CUSTOMIZER_TOKENS}>
      <ProductCustomizer
        controller={controller}
        classNames={PINK_CUSTOMIZER_CLASSNAMES}
        trayClassNames={PINK_CUSTOMIZER_TRAY}
      />
    </div>
  );
}
