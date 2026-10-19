import { describe, expect, it, vi } from "vitest";

import { computeReviewStats, updateProductStats } from "./product-stats";

describe("computeReviewStats", () => {
  it("returns a null average for no reviews", () => {
    expect(computeReviewStats([])).toEqual({
      reviewCount: 0,
      averageRating: null,
    });
  });
  it("averages ratings", () => {
    expect(computeReviewStats([5, 4, 3])).toEqual({
      reviewCount: 3,
      averageRating: 4,
    });
  });
});

describe("updateProductStats", () => {
  it("counts only approved, non-hidden reviews and writes the result", async () => {
    const findMany = vi.fn().mockResolvedValue([{ rating: 5 }, { rating: 4 }]);
    const update = vi.fn().mockResolvedValue({});
    await updateProductStats(
      { productReview: { findMany }, product: { update } },
      "p1",
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { productId: "p1", isApproved: true, isHidden: false },
      select: { rating: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { reviewCount: 2, averageRating: 4.5 },
    });
  });
});
