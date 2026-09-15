import type { OliveCardProduct } from "./olive-product-card";
import { cn } from "~/lib/utils";

import { OliveEmptyState } from "./olive-empty-state";
import { OliveProductCard } from "./olive-product-card";
import { OliveRevealGroup } from "./olive-reveal";

/** Column counts the swatch grid supports, densest last. */
export type OliveGridColumns = 2 | 3 | 4;

const COLUMN_CLASS: Record<OliveGridColumns, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

type OliveProductGridProps = {
  products: OliveCardProduct[];
  /** Widest breakpoint's column count. Always 2-up on phones. Default 4. */
  columns?: OliveGridColumns;
  /** Give the first row `priority` images. Default 0. */
  priorityCount?: number;
  /** Heading level for each card's product name (2 when the grid sits directly under the page h1). */
  headingLevel?: 2 | 3;
  /** Turn off the per-card quick-add pill (a related-products strip, say). */
  showQuickAdd?: boolean;
  /** Empty-state copy. Required — a blank grid is never an acceptable answer. */
  emptyHeading: string;
  emptyBody?: string;
  emptyCta?: { label: string; href: string };
  className?: string;
};

/**
 * OliveProductGrid — the swatch grid.
 *
 * Four columns of cards at 12px gutters, dealt in on reveal: `OliveRevealGroup`
 * with `fan` leans alternate cards the other way so a row arrives like a hand
 * of swatches rather than a spreadsheet. Two columns on phones at every
 * setting — the density is the point.
 *
 * An empty result renders the ghost card instead of nothing, so a filtered
 * shop, an empty collection and a store with no products all explain
 * themselves.
 */
export function OliveProductGrid({
  products,
  columns = 4,
  priorityCount = 0,
  headingLevel = 3,
  showQuickAdd = true,
  emptyHeading,
  emptyBody,
  emptyCta,
  className,
}: OliveProductGridProps) {
  if (products.length === 0) {
    return (
      <OliveEmptyState
        heading={emptyHeading}
        body={emptyBody}
        cta={emptyCta}
        className={className}
      />
    );
  }

  return (
    <OliveRevealGroup
      fan
      className={cn("grid gap-3", COLUMN_CLASS[columns], className)}
    >
      {products.map((product, i) => (
        <OliveProductCard
          key={product.id}
          product={product}
          index={i}
          priority={i < priorityCount}
          headingLevel={headingLevel}
          showQuickAdd={showQuickAdd}
        />
      ))}
    </OliveRevealGroup>
  );
}
