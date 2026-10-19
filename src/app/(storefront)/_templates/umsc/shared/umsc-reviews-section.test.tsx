import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UmscReviewCard } from "./umsc-review-card";
import { toUmscReviewCards } from "./umsc-reviews-section";

const sources = { verifiedSource: "Verified order" };

const testimonials = [
  {
    text: "Smells incredible.",
    customerName: "Chiena",
    source: "owner",
  },
  {
    text: "Arrived fast.",
    customerName: "Dana",
    source: "customer",
  },
];

describe("toUmscReviewCards", () => {
  it("gives an owner-added testimonial no source line", () => {
    const [owner] = toUmscReviewCards(testimonials, sources, 3);

    expect(owner).toEqual({
      quote: "Smells incredible.",
      name: "Chiena",
      source: undefined,
    });
  });

  it("gives a customer-submitted testimonial the verified label", () => {
    const [, customer] = toUmscReviewCards(testimonials, sources, 3);

    expect(customer?.source).toBe("Verified order");
  });

  it("respects the limit", () => {
    expect(toUmscReviewCards(testimonials, sources, 1)).toHaveLength(1);
  });
});

describe("UmscReviewCard source line", () => {
  it("shows only the reviewer name when there is no source", () => {
    render(<UmscReviewCard quote="Smells incredible." name="Chiena" />);

    expect(screen.getByText("Chiena")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("shows the source after the name when one is given", () => {
    render(
      <UmscReviewCard
        quote="Arrived fast."
        name="Dana"
        source="Verified order"
      />,
    );

    expect(screen.getByText(/Verified order/)).toBeInTheDocument();
  });
});
