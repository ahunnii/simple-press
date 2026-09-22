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
  /**
   * A signature for "the results changed for a reason other than first
   * arrival" — a filter, sort, or page. Passed as `key` on the inner reveal
   * group: `useOliveReveal`'s IntersectionObserver disconnects after firing
   * once, so filtered results otherwise teleport in with no motion. Changing
   * this key remounts the group; the observer reconnects against a grid
   * already on screen and fires immediately, so the existing dealt-card
   * stagger replays as an answer to the interaction, not a page load.
   *
   * Build it from filter/sort/page state only — never a field value, or every
   * keystroke in the live editor re-deals the whole grid — and never pass the
   * page's *initial* signature, or the grid re-deals on mount.
   */
  dealKey?: string | number;
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
  dealKey,
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
      key={dealKey}
      fan
      data-redeal={dealKey}
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
