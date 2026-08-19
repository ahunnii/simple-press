import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicQuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";

/**
 * Unit tests for `QuoteCalculatorBlock`'s OUTER/INNER wrapper structure — the
 * width/layout classing contract documented in the component's docblock and
 * consumed by `relocation-generic-page.tsx`'s `:where(&>:not(.sp-quote-breakout))`
 * breakout selector.
 *
 * Follows the mocking pattern in `quote-calculator-runner.test.tsx`: `~/trpc/react`
 * is replaced with a controllable fake so loading / error(NOT_FOUND) / ready
 * states can each be driven directly. `QuoteCalculatorRunner` itself is also
 * mocked out here — its tRPC surface (submit/previewEstimate/lookupZip) is
 * exercised by its own test file, so this file can stay focused on the
 * block's wrapper concerns.
 */

type QueryState = {
  data?: {
    id: string;
    name: string;
    definition: PublicQuoteCalculatorDefinition;
  };
  isLoading: boolean;
  error?: { data?: { code?: string } };
};

let queryState: QueryState = { isLoading: true };

vi.mock("~/trpc/react", () => ({
  api: {
    quoteCalculator: {
      getByIdPublic: {
        useQuery: () => queryState,
      },
    },
  },
}));

vi.mock("./quote-calculator-runner", () => ({
  QuoteCalculatorRunner: () => <div data-testid="runner-stub" />,
}));

const definition: PublicQuoteCalculatorDefinition = {
  screens: [
    {
      id: "s-1",
      title: null,
      description: null,
      questions: [
        {
          id: "q-1",
          type: "text",
          title: "Name",
          description: null,
          required: false,
          showIf: null,
        },
      ],
    },
  ],
  showEstimateToCustomer: false,
  showReviewStep: false,
  showLiveEstimate: false,
  liveEstimateDisclaimer: "",
  requirePhone: false,
  responseDays: 2,
  thankYouMessage: "Thanks!",
};

const readyData = { id: "calc-1", name: "Moving quote", definition };

/**
 * Every state (loading/error/ready) renders the SAME OUTER > INNER shape as
 * its top two elements — see the docblock on `QuoteCalculatorBlock`.
 */
function outerAndInner(container: HTMLElement) {
  const outer = container.firstElementChild;
  const inner = outer?.firstElementChild ?? null;
  return { outer, inner };
}

describe("QuoteCalculatorBlock", () => {
  it("ready + width 'full': outer carries the breakout marker, inner has no width class or mx-auto", async () => {
    queryState = { isLoading: false, data: readyData };
    const { QuoteCalculatorBlock } = await import("./quote-calculator-block");
    const { container } = render(
      <QuoteCalculatorBlock calculatorId="calc-1" width="full" />,
    );

    const { outer, inner } = outerAndInner(container);
    expect(outer).toHaveClass("sp-quote-breakout");
    expect(inner).not.toHaveClass("mx-auto");
    expect(inner?.className).toBe("");
  });

  it("ready + width 'medium': inner carries max-w-2xl mx-auto, outer has no breakout marker", async () => {
    queryState = { isLoading: false, data: readyData };
    const { QuoteCalculatorBlock } = await import("./quote-calculator-block");
    const { container } = render(
      <QuoteCalculatorBlock calculatorId="calc-1" width="medium" />,
    );

    const { outer, inner } = outerAndInner(container);
    expect(outer).not.toHaveClass("sp-quote-breakout");
    expect(inner).toHaveClass("max-w-2xl", "mx-auto");
  });

  it("layout 'centered': outer carries the flex centering classes regardless of width", async () => {
    queryState = { isLoading: false, data: readyData };
    const { QuoteCalculatorBlock } = await import("./quote-calculator-block");
    const { container } = render(
      <QuoteCalculatorBlock
        calculatorId="calc-1"
        width="medium"
        layout="centered"
      />,
    );

    const { outer } = outerAndInner(container);
    expect(outer).toHaveClass(
      "flex",
      "min-h-[70vh]",
      "flex-col",
      "justify-center",
    );
  });

  it("loading (skeleton) state shares the outer/inner structure, with the breakout marker at full width", async () => {
    queryState = { isLoading: true };
    const { QuoteCalculatorBlock } = await import("./quote-calculator-block");
    const { container } = render(
      <QuoteCalculatorBlock calculatorId="calc-1" width="full" />,
    );

    const { outer, inner } = outerAndInner(container);
    expect(outer).toHaveClass("sp-quote-breakout");
    expect(inner).not.toHaveClass("mx-auto");
    expect(inner).toHaveClass("animate-pulse");
  });

  it("unavailable (placeholder) state shares the outer/inner structure, with the breakout marker at full width", async () => {
    queryState = {
      isLoading: false,
      error: { data: { code: "NOT_FOUND" } },
    };
    const { QuoteCalculatorBlock } = await import("./quote-calculator-block");
    const { container, getByText } = render(
      <QuoteCalculatorBlock calculatorId="calc-1" width="full" />,
    );

    const { outer, inner } = outerAndInner(container);
    expect(outer).toHaveClass("sp-quote-breakout");
    expect(inner).not.toHaveClass("mx-auto");
    expect(getByText("Quote calculator is not available")).toBeInTheDocument();
  });
});
