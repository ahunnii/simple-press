"use client";

import type { Product } from "~/types";

import { UmscProductCard } from "./umsc-product-card";

type Props = {
  products: Product[];
  /**
   * When true (default), each card is wrapped in a `.umsc-reveal-item` div
   * with a `--i` stagger index. Set to false inside an already-staggered
   * parent.
   */
  revealItems?: boolean;
};

/**
 * UmscProductGrid — 4→2→1 responsive grid, 16px gap, per design.md.
 * Expects the parent to own the `.umsc-reveal-group` / `is-visible`
 * container (via `UmscRevealGroup`) when `revealItems` is true.
 */
export function UmscProductGrid({ products, revealItems = true }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product, i) =>
        revealItems ? (
          <div
            key={product.id}
            className="umsc-reveal-item"
            style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
          >
            <UmscProductCard product={product} />
          </div>
        ) : (
          <UmscProductCard key={product.id} product={product} />
        ),
      )}
    </div>
  );
}
