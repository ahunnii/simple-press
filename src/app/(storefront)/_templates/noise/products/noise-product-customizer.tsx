"use client";

import type { CSSProperties } from "react";

import type {
  ProductCustomizerClassNames,
  ProductCustomizerController,
  ProductCustomizerTrayClassNames,
} from "~/components/customizer";
import { ProductCustomizer } from "~/components/customizer";

/**
 * Product options (the shared customizer) dressed for Visual Noise: ink-ruled
 * square tiles, mono caps labels, a bone check badge. Noise does not remap the
 * shadcn tokens globally (see `.noise-subscribe-panel` in globals.css), so the
 * wrapper remaps the few the shared renderer reads, scoped to this subtree:
 * `--primary` (selected ring + check badge), `--input` (tile border, ≥3:1 on
 * white), `--muted-foreground` (counts, prices; AA on paper), `--ring`.
 */
const NOISE_CUSTOMIZER_TOKENS = {
  "--primary": "var(--vn-ink)",
  "--primary-foreground": "var(--vn-bone)",
  "--input": "var(--vn-steel-mist)",
  "--border": "var(--vn-rule)",
  "--background": "var(--vn-paper)",
  "--foreground": "var(--vn-ink)",
  "--muted": "var(--vn-bone)",
  "--muted-foreground": "var(--vn-ink-soft)",
  "--ring": "var(--vn-ink)",
} as CSSProperties;

export const NOISE_CUSTOMIZER_CLASSNAMES: ProductCustomizerClassNames = {
  root: "gap-6",
  legend:
    "font-mono text-[10px] font-normal tracking-[0.24em] uppercase text-[var(--vn-ink)]",
  help: "font-sans text-xs",
  count: "font-mono text-[10px] tracking-[0.16em] uppercase",
  value:
    "rounded-none font-sans text-xs hover:bg-[var(--vn-bone)] has-[:focus-visible]:outline-[var(--vn-ink)]",
  valueImage: "rounded-none",
  valueLabel: "font-sans",
  valuePrice: "font-mono text-[10px] tracking-[0.12em] uppercase",
  clear:
    "font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--vn-ink-soft)] hover:text-[var(--vn-ink)] self-start",
  textInput:
    "rounded-none border-[var(--vn-ink)] font-sans text-sm focus-visible:border-[var(--vn-ink)] focus-visible:ring-[var(--vn-ink)]/30",
  textCounter: "font-mono text-[10px] tracking-[0.12em]",
  limit: "font-mono text-[10px] tracking-[0.12em]",
  error: "font-mono text-[11px] tracking-[0.06em]",
};

const NOISE_CUSTOMIZER_TRAY: ProductCustomizerTrayClassNames = {
  root: "gap-1.5",
  item: "rounded-none border-[var(--vn-rule)] bg-[var(--vn-bone)] font-mono text-[10px] tracking-[0.12em] uppercase",
  image: "rounded-none",
  swatch: "rounded-none",
};

export function NoiseProductCustomizer({
  controller,
}: {
  controller: ProductCustomizerController;
}) {
  if (!controller.enabled) return null;
  return (
    <div className="noise-customizer" style={NOISE_CUSTOMIZER_TOKENS}>
      <ProductCustomizer
        controller={controller}
        classNames={NOISE_CUSTOMIZER_CLASSNAMES}
        trayClassNames={NOISE_CUSTOMIZER_TRAY}
      />
    </div>
  );
}
