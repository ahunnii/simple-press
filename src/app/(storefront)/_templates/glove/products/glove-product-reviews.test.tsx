import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GloveProductReviews } from "./glove-product-reviews";

let reviewsOn = true;
let stats: { totalReviews: number } | undefined;
const useQuery = vi.fn((_input: unknown, opts?: { enabled?: boolean }) => ({
  data: opts?.enabled === false ? undefined : stats,
}));

vi.mock("~/trpc/react", () => ({
  api: {
    review: {
      getProductStats: { useQuery: (...a: [unknown, never]) => useQuery(...a) },
    },
  },
}));
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({ isEnabled: () => reviewsOn }),
}));
vi.mock("~/components/product-reviews", () => ({
  ProductReviews: () => <div data-testid="platform-reviews" />,
}));
vi.mock("~/components/write-review-dialog", () => ({
  WriteReviewDialog: () => null,
}));

const props = {
  productId: "p1",
  productName: "Driving Glove",
  heading: "Reviews",
  prompt: "Wearing hers?",
  body: "Tell us how she loves her LuvGluv.",
  buttonLabel: "Write a review",
};

beforeEach(() => {
  reviewsOn = true;
  stats = undefined;
  useQuery.mockClear();
});

describe("GloveProductReviews", () => {
  it("renders nothing and fires no query when reviews are off", () => {
    reviewsOn = false;
    const { container } = render(<GloveProductReviews {...props} />);
    expect(container).toBeEmptyDOMElement();
    expect(useQuery).toHaveBeenCalledWith(
      { productId: "p1" },
      { enabled: false },
    );
  });

  it("shows one warm empty state instead of the platform list when there are no reviews", () => {
    stats = { totalReviews: 0 };
    render(<GloveProductReviews {...props} />);
    expect(screen.queryByTestId("platform-reviews")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Wearing hers?" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Write a review" }),
    ).toHaveLength(1);
    expect(screen.queryByText(/be the first/i)).not.toBeInTheDocument();
  });

  it("keeps the list beside the invitation once there are reviews", () => {
    stats = { totalReviews: 3 };
    render(<GloveProductReviews {...props} />);
    expect(screen.getByTestId("platform-reviews")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Write a review" }),
    ).toBeInTheDocument();
  });

  it("keeps the list while the count is still loading", () => {
    render(<GloveProductReviews {...props} />);
    expect(screen.getByTestId("platform-reviews")).toBeInTheDocument();
  });
});
