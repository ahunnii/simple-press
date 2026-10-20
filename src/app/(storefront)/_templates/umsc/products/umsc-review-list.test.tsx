import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UmscReviewList } from "./umsc-review-list";

type Stats = {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

let stats: Stats | undefined;
let reviews: unknown[] | undefined;
const listInput = vi.fn();
const voteMutate = vi.fn();
const invalidate = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ review: { listByProduct: { invalidate } } }),
    review: {
      getProductStats: { useQuery: () => ({ data: stats }) },
      listByProduct: {
        useQuery: (input: unknown) => {
          listInput(input);
          return { data: reviews };
        },
      },
      vote: {
        useMutation: (opts?: { onSuccess?: () => void }) => ({
          isPending: false,
          mutate: (v: unknown) => {
            voteMutate(v);
            opts?.onSuccess?.();
          },
        }),
      },
    },
  },
}));

// The reveal hook needs matchMedia / IntersectionObserver; render settled.
vi.mock("../shared/umsc-reveal", () => ({
  UmscRevealGroup: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

const NOW = new Date("2026-10-19T12:00:00Z");

function makeReview(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `r${i}`,
    rating: 5,
    title: `Title ${i}`,
    comment: `Comment ${i}`,
    images: [],
    videoUrl: null,
    verifiedPurchase: false,
    customerName: `Customer ${i}`,
    reviewDate: new Date("2026-09-19T12:00:00Z"),
    createdAt: new Date("2026-10-18T12:00:00Z"),
    helpfulCount: 2,
    notHelpfulCount: 1,
    ...over,
  };
}

const baseStats: Stats = {
  totalReviews: 7,
  averageRating: 4.6,
  ratingDistribution: { 5: 5, 4: 2, 3: 0, 2: 0, 1: 0 },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  stats = baseStats;
  reviews = [makeReview(1)];
  listInput.mockClear();
  voteMutate.mockClear();
  invalidate.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UmscReviewList", () => {
  it("shows a loading state until stats and reviews arrive", () => {
    stats = undefined;
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading reviews");
  });

  it("renders the average and review count in the summary", () => {
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("Based on 7 reviews")).toBeInTheDocument();
  });

  it("singularizes a one-review count", () => {
    stats = {
      totalReviews: 1,
      averageRating: 5,
      ratingDistribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(screen.getByText("Based on 1 review")).toBeInTheDocument();
  });

  it("filters by a distribution row, marks it pressed, and clears it", () => {
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    const row = screen.getByRole("button", { name: "4-star reviews: 2" });
    expect(row).toHaveAttribute("aria-pressed", "false");
    expect(listInput).toHaveBeenLastCalledWith({
      productId: "p1",
      sortBy: "recent",
      rating: undefined,
    });

    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-pressed", "true");
    expect(listInput).toHaveBeenLastCalledWith({
      productId: "p1",
      sortBy: "recent",
      rating: 4,
    });

    // Clicking the active row again clears it.
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-pressed", "false");
    expect(listInput).toHaveBeenLastCalledWith({
      productId: "p1",
      sortBy: "recent",
      rating: undefined,
    });

    // The explicit Clear filter control does the same.
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(row).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Clear filter" }),
    ).not.toBeInTheDocument();
  });

  it("passes the chosen sort to the list query", () => {
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "helpful" },
    });
    expect(listInput).toHaveBeenLastCalledWith({
      productId: "p1",
      sortBy: "helpful",
      rating: undefined,
    });
  });

  it("dates a review from reviewDate, not createdAt", () => {
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    // reviewDate is a month back; createdAt was yesterday.
    expect(screen.getByText("about 1 month ago")).toBeInTheDocument();
    expect(screen.queryByText("1 day ago")).not.toBeInTheDocument();
  });

  it("shows the verified mark only for verified purchases", () => {
    reviews = [
      makeReview(1, { verifiedPurchase: true }),
      makeReview(2, { verifiedPurchase: false }),
    ];
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(screen.getAllByText("Verified purchase")).toHaveLength(1);
    const [first, second] = screen.getAllByRole("article");
    expect(within(first!).getByText("Verified purchase")).toBeInTheDocument();
    expect(
      within(second!).queryByText("Verified purchase"),
    ).not.toBeInTheDocument();
  });

  it("renders photos as new-tab links with meaningful alt text, and a video", () => {
    reviews = [
      makeReview(1, {
        images: ["https://img.test/a.jpg", "https://img.test/b.jpg"],
        videoUrl: "https://vid.test/v.mp4",
      }),
    ];
    const { container } = render(
      <UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />,
    );
    const photo = screen.getByAltText("Photo 2 of 2 from Customer 1's review");
    const link = photo.closest("a");
    expect(link).toHaveAttribute("href", "https://img.test/b.jpg");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://vid.test/v.mp4",
    );
  });

  it("votes and invalidates the list", () => {
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Helpful: 2" }));
    expect(voteMutate).toHaveBeenCalledWith({
      reviewId: "r1",
      isHelpful: true,
    });
    expect(invalidate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Not helpful: 1" }));
    expect(voteMutate).toHaveBeenLastCalledWith({
      reviewId: "r1",
      isHelpful: false,
    });
  });

  it("opens the write-a-review flow from the summary band", () => {
    const onWrite = vi.fn();
    render(<UmscReviewList productId="p1" onWriteReviewClick={onWrite} />);
    fireEvent.click(screen.getByRole("button", { name: "Write a review" }));
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("caps the list at 10 and loads 10 more at a time", () => {
    reviews = Array.from({ length: 25 }, (_, i) => makeReview(i + 1));
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(screen.getAllByRole("article")).toHaveLength(10);

    fireEvent.click(
      screen.getByRole("button", { name: "Load more reviews (15 remaining)" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(20);

    fireEvent.click(
      screen.getByRole("button", { name: "Load more reviews (5 remaining)" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(25);
    expect(
      screen.queryByRole("button", { name: /Load more/ }),
    ).not.toBeInTheDocument();
  });

  it("hides load more at or under 10 reviews", () => {
    reviews = Array.from({ length: 10 }, (_, i) => makeReview(i + 1));
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /Load more/ }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state with a write-a-review call to action", () => {
    stats = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
    reviews = [];
    const onWrite = vi.fn();
    render(<UmscReviewList productId="p1" onWriteReviewClick={onWrite} />);
    expect(
      screen.getByRole("heading", { name: "No reviews yet" }),
    ).toBeInTheDocument();
    // No stats band or controls when there is nothing to summarize.
    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Write a review" }));
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it("offers a way back when a star filter matches nothing", () => {
    reviews = [];
    render(<UmscReviewList productId="p1" onWriteReviewClick={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "3-star reviews: 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Show all reviews" }));
    expect(
      screen.getByRole("button", { name: "3-star reviews: 0" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
