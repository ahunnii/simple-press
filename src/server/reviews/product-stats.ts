/**
 * Product review stats (reviewCount + averageRating), shared by the review
 * router and one-off scripts (scripts/umsc/import-wix-reviews.ts).
 *
 * Only approved, non-hidden reviews count. Kept free of `~/server/db`, `~/env`
 * and tRPC imports so a plain script can load it; the client is described
 * structurally, so the app's extended Prisma client, a transaction client and a
 * bare generated PrismaClient all satisfy it.
 */

export function computeReviewStats(ratings: readonly number[]): {
  reviewCount: number;
  averageRating: number | null;
} {
  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0 ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount : null;
  return { reviewCount, averageRating };
}

export interface ProductStatsClient {
  productReview: {
    findMany: (args: {
      where: { productId: string; isApproved: true; isHidden: false };
      select: { rating: true };
    }) => PromiseLike<{ rating: number }[]>;
  };
  product: {
    update: (args: {
      where: { id: string };
      data: { reviewCount: number; averageRating: number | null };
    }) => PromiseLike<unknown>;
  };
}

export async function updateProductStats(
  db: ProductStatsClient,
  productId: string,
) {
  const reviews = await db.productReview.findMany({
    where: { productId, isApproved: true, isHidden: false },
    select: { rating: true },
  });
  const { reviewCount, averageRating } = computeReviewStats(
    reviews.map((r) => r.rating),
  );
  await db.product.update({
    where: { id: productId },
    data: { reviewCount, averageRating },
  });
}
