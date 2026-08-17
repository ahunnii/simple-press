"use client";

import { Calculator } from "lucide-react";

import type {
  QuoteDensity,
  QuoteHeight,
  QuoteWidth,
} from "~/lib/quote/quote-display";
import { quoteWidthClass } from "~/lib/quote/quote-display";
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
 * `width`/`height`/`density` come off the tiptap node's `data-quote-*` attrs
 * (already coerced by the caller — see `~/components/tiptap-renderer.tsx`).
 * `width` sizes THIS wrapper (mirroring `EmbedFrame`'s width-wrapper
 * precedent); `height`/`density` are forwarded to the runner.
 */
export function QuoteCalculatorBlock({
  calculatorId,
  width,
  height,
  density,
}: {
  calculatorId: string | null;
  width?: QuoteWidth;
  height?: QuoteHeight;
  density?: QuoteDensity;
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
  const wrapperClass = cn(
    "not-prose my-6",
    widthClass,
    widthClass && "mx-auto",
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          wrapperClass,
          "bg-muted/50 border-input animate-pulse rounded-lg border py-24",
        )}
      />
    );
  }

  const code = error?.data?.code;
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    return (
      <div
        className={cn(
          wrapperClass,
          "border-input bg-muted/30 text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12",
        )}
      >
        <Calculator className="size-8 opacity-40" aria-hidden="true" />
        <p className="text-sm">Quote calculator is not available</p>
      </div>
    );
  }

  if (!calculator) return null;

  return (
    <div className={wrapperClass}>
      <QuoteCalculatorRunner
        calculator={calculator}
        height={height}
        density={density}
      />
    </div>
  );
}
