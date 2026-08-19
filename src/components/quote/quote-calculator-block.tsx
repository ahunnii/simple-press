"use client";

import { Calculator } from "lucide-react";

import type {
  QuoteDensity,
  QuoteHeight,
  QuoteLayout,
  QuoteWidth,
} from "~/lib/quote/quote-display";
import { quoteLayoutClass, quoteWidthClass } from "~/lib/quote/quote-display";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { QuoteCalculatorRunner } from "./quote-calculator-runner";

/**
 * Renders a single quote calculator by id, for a `quoteCalculator` node
 * embedded in CMS page or blog-post rich text.
 *
 * Mirrors `GalleryBlock` in `~/components/tiptap-renderer`: the same four
 * states (no id → nothing, loading → skeleton, unavailable → placeholder,
 * ready → widget), and the same reason for the placeholder. A page whose
 * calculator has been unpublished, deleted, or whose business turned the
 * feature off must not collapse to a hole in the middle of the article, and
 * must not leak *which* of those happened — `getByIdPublic` deliberately
 * returns NOT_FOUND for both "missing" and "unpublished" so an id cannot be
 * used to enumerate an owner's drafts.
 *
 * `width`/`height`/`density`/`layout` come off the tiptap node's
 * `data-quote-*` attrs (already coerced by the caller — see
 * `~/components/tiptap-renderer.tsx`). `width` sizes the INNER wrapper
 * (mirroring `EmbedFrame`'s width-wrapper precedent); `height`/`density` are
 * forwarded to the runner; `layout` sizes/aligns the OUTER wrapper.
 *
 * Every state renders the SAME two-level OUTER/INNER structure so the
 * footprint never jumps between loading → placeholder → ready:
 * - OUTER carries spacing, the `layout` centering classes, and — only when
 *   `width === "full"` — the `sp-quote-breakout` marker class.
 *   `sp-quote-breakout` has NO CSS of its own anywhere in the codebase; it
 *   exists purely as a hook templates can key off of with a `:not()`
 *   selector to exempt full-width calculators from a prose/article
 *   max-width cap (see `relocation-generic-page.tsx` for the reference
 *   usage). Non-full widths never carry it — the INNER div's own `max-w-*`
 *   already contains them, so there is nothing to break out of.
 * - INNER carries the width class + `mx-auto` (when a width is set) plus
 *   this state's chrome (border/background/padding/etc). For `width="full"`
 *   the inner div has no width class and no `mx-auto` — it simply fills the
 *   outer, which is exactly today's behavior.
 */
export function QuoteCalculatorBlock({
  calculatorId,
  width,
  height,
  density,
  layout,
}: {
  calculatorId: string | null;
  width?: QuoteWidth;
  height?: QuoteHeight;
  density?: QuoteDensity;
  layout?: QuoteLayout;
}) {
  const {
    data: calculator,
    isLoading,
    error,
  } = api.quoteCalculator.getByIdPublic.useQuery(calculatorId ?? "", {
    enabled: !!calculatorId,
    retry: false,
  });

  if (!calculatorId) return null;

  const widthClass = quoteWidthClass(width);
  const outerClass = cn(
    "not-prose my-6",
    widthClass === "" && "sp-quote-breakout",
    quoteLayoutClass(layout),
  );
  const innerClass = cn(widthClass, widthClass && "mx-auto");

  if (isLoading) {
    return (
      <div className={outerClass}>
        <div
          className={cn(
            innerClass,
            "bg-muted/50 border-input animate-pulse rounded-lg border py-24",
          )}
        />
      </div>
    );
  }

  const code = error?.data?.code;
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    return (
      <div className={outerClass}>
        <div
          className={cn(
            innerClass,
            "border-input bg-muted/30 text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12",
          )}
        >
          <Calculator className="size-8 opacity-40" aria-hidden="true" />
          <p className="text-sm">Quote calculator is not available</p>
        </div>
      </div>
    );
  }

  if (!calculator) return null;

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <QuoteCalculatorRunner
          calculator={calculator}
          height={height}
          density={density}
        />
      </div>
    </div>
  );
}
