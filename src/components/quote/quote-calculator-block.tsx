"use client";

import { Calculator } from "lucide-react";

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
 */
export function QuoteCalculatorBlock({
  calculatorId,
}: {
  calculatorId: string | null;
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

  if (isLoading) {
    return (
      <div className="not-prose bg-muted/50 border-input my-6 animate-pulse rounded-lg border py-24" />
    );
  }

  const code = error?.data?.code;
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    return (
      <div className="not-prose border-input bg-muted/30 text-muted-foreground my-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
        <Calculator className="size-8 opacity-40" aria-hidden="true" />
        <p className="text-sm">Quote calculator is not available</p>
      </div>
    );
  }

  if (!calculator) return null;

  return (
    <div className="not-prose my-6">
      <QuoteCalculatorRunner calculator={calculator} />
    </div>
  );
}
