"use client";

import type { Product } from "~/types";

import { ViiProductCard } from "./vii-product-card";

type Props = {
  products: Product[];
  /** Minimum column width in px used in `repeat(auto-fill, minmax(...))`. Default 220. */
  minColWidth?: number;
  /**
   * When true (default), each card is wrapped in a `vii-reveal-item` div with
   * a `--i` stagger index, matching the scroll-reveal pattern in vii-product-rail.
   * Set to false to render bare cards (e.g. inside an already-staggered parent).
   */
  revealItems?: boolean;
};

/**
 * ViiProductGrid — the shared auto-fill product grid for the vii template.
 *
 * Reproduces the grid markup from `vii-product-rail.tsx` lines 97–116:
 * `repeat(auto-fill, minmax(220px, 1fr))` with a fluid gap, each card wrapped
 * in a `vii-reveal-item` div carrying a CSS `--i` stagger counter capped at 7.
 *
 * Expects the parent to own the `vii-reveal-group` / `is-visible` container
 * (via `ViiSection`'s `revealRef` + `revealVisible`, or directly).
 */
export function ViiProductGrid({
  products,
  minColWidth = 220,
  revealItems = true,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: "clamp(20px, 3vw, 36px)",
      }}
    >
      {products.map((product, i) =>
        revealItems ? (
          <div
            key={product.id}
            className="vii-reveal-item"
            style={{ "--i": Math.min(i + 1, 7) } as React.CSSProperties}
          >
            <ViiProductCard product={product} index={i} />
          </div>
        ) : (
          <ViiProductCard key={product.id} product={product} index={i} />
        ),
      )}
    </div>
  );
}
