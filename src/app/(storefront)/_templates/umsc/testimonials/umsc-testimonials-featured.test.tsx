import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { UmscTestimonialsFeatured } from "./umsc-testimonials-featured";

/**
 * The featured caption under each reviewer's name: title/company when set,
 * else the "Review source label" for customer reviews only. Owner-added
 * reviews with no title or company show the name alone.
 */

const SOURCE_LABEL = "Verified customer";

type Row = {
  id: string;
  text: string;
  customerName: string;
  source: string;
  customerTitle: string | null;
  customerCompany: string | null;
};

function row(overrides: Partial<Row> & Pick<Row, "id">): Row {
  return {
    text: "A lovely candle.",
    customerName: "Dana",
    source: "customer",
    customerTitle: null,
    customerCompany: null,
    ...overrides,
  };
}

function renderFeatured(testimonials: Row[]) {
  return render(
    <UmscTestimonialsFeatured
      // The page passes full RouterOutputs rows; only these fields matter here.
      testimonials={testimonials as never}
      sourceLabel={SOURCE_LABEL}
      emptyMessage="No reviews yet."
    />,
  );
}

beforeEach(() => {
  // Reduced motion: the reveal hook shows content straight away and never
  // sets up an IntersectionObserver.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("UmscTestimonialsFeatured caption", () => {
  it("falls back to the source label for a customer review with no title or company", () => {
    renderFeatured([row({ id: "c1", source: "customer" })]);

    expect(screen.getByText(SOURCE_LABEL)).toBeInTheDocument();
  });

  it("shows no caption for an owner-added review with no title or company", () => {
    const { container } = renderFeatured([
      row({ id: "o1", source: "owner", customerName: "Chiena" }),
    ]);

    expect(screen.getByText("Chiena")).toBeInTheDocument();
    expect(screen.queryByText(SOURCE_LABEL)).toBeNull();
    expect(container.textContent).not.toContain("·");
  });

  it("shows the title and company for an owner-added review that has them", () => {
    renderFeatured([
      row({
        id: "o2",
        source: "owner",
        customerName: "Chiena",
        customerTitle: "Regular",
        customerCompany: "Bloom Co",
      }),
    ]);

    expect(screen.getByText("Regular, Bloom Co")).toBeInTheDocument();
    expect(screen.queryByText(SOURCE_LABEL)).toBeNull();
  });

  it("applies the same rule to the masonry cards behind the featured quote", () => {
    const { container } = renderFeatured([
      row({ id: "f1", source: "customer", customerName: "Featured" }),
      row({ id: "o3", source: "owner", customerName: "Chiena" }),
      row({ id: "c2", source: "customer", customerName: "Dana" }),
    ]);

    // Two customer captions in total: the featured quote and the customer
    // card in the masonry. The owner card shows its name only.
    const text = container.textContent ?? "";
    expect(text.split(SOURCE_LABEL)).toHaveLength(3);
    expect(screen.getByText("Chiena").parentElement?.textContent).toBe(
      "Chiena",
    );
  });
});
