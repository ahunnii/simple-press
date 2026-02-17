import type { Prisma, PrismaClient } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function assertBusinessOwner(
  db: PrismaClient,
  userId: string,
  businessId: string,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { businessId: true },
  });
  if (user?.businessId !== businessId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
}

async function getReviewAndAssertOwner(
  db: PrismaClient,
  userId: string,
  reviewId: string,
) {
  const review = await db.productReview.findUnique({
    where: { id: reviewId },
    include: { product: { select: { businessId: true } } },
  });
  if (!review) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
  }
  await assertBusinessOwner(db, userId, review.product.businessId);
  return review;
}

async function updateProductStats(db: PrismaClient, productId: string) {
  const reviews = await db.productReview.findMany({
    where: { productId, isApproved: true, isHidden: false },
    select: { rating: true },
  });
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r) => sum + r.rating, 0) / reviewCount
      : null;
  await db.product.update({
    where: { id: productId },
    data: { reviewCount, averageRating },
  });
}

async function updateVoteCounts(db: PrismaClient, reviewId: string) {
  const votes = await db.reviewVote.findMany({
    where: { reviewId },
    select: { isHelpful: true },
  });
  await db.productReview.update({
    where: { id: reviewId },
    data: {
      helpfulCount: votes.filter((v) => v.isHelpful).length,
      notHelpfulCount: votes.filter((v) => !v.isHelpful).length,
    },
  });
}

// ─── Router ────────────────────────────────────────────────────────────────

export const reviewRouter = createTRPCRouter({
  // ── Public ──────────────────────────────────────────────────────────────

  listByProduct: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        approvedOnly: z.boolean().default(true),
        sortBy: z
          .enum(["recent", "helpful", "rating_high", "rating_low"])
          .default("recent"),
        rating: z.number().min(1).max(5).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderBy: Record<
        string,
        Prisma.ProductReviewOrderByWithRelationInput
      > = {
        recent: { reviewDate: "desc" },
        helpful: { helpfulCount: "desc" },
        rating_high: { rating: "desc" },
        rating_low: { rating: "asc" },
      };

      return ctx.db.productReview.findMany({
        where: {
          productId: input.productId,
          ...(input.approvedOnly && { isApproved: true, isHidden: false }),
          ...(input.rating && { rating: input.rating }),
        },
        orderBy: orderBy[input.sortBy],
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  getProductStats: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.productReview.findMany({
        where: {
          productId: input.productId,
          isApproved: true,
          isHidden: false,
        },
        select: { rating: true, verifiedPurchase: true, source: true },
      });

      const total = reviews.length;
      const avg =
        total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

      return {
        totalReviews: total,
        averageRating: Math.round(avg * 10) / 10,
        ratingDistribution: {
          5: reviews.filter((r) => r.rating === 5).length,
          4: reviews.filter((r) => r.rating === 4).length,
          3: reviews.filter((r) => r.rating === 3).length,
          2: reviews.filter((r) => r.rating === 2).length,
          1: reviews.filter((r) => r.rating === 1).length,
        },
        verifiedPurchases: reviews.filter((r) => r.verifiedPurchase).length,
        ownerAdded: reviews.filter((r) => r.source === "owner").length,
      };
    }),

  vote: publicProcedure
    .input(
      z.object({
        reviewId: z.string(),
        isHelpful: z.boolean(),
        userId: z.string().optional(),
        ipAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.userId && !input.ipAddress) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "userId or ipAddress required",
        });
      }

      const existing = await ctx.db.reviewVote.findFirst({
        where: {
          reviewId: input.reviewId,
          OR: [
            ...(input.userId ? [{ userId: input.userId }] : []),
            ...(input.ipAddress ? [{ ipAddress: input.ipAddress }] : []),
          ],
        },
      });

      if (existing) {
        if (existing.isHelpful !== input.isHelpful) {
          await ctx.db.reviewVote.update({
            where: { id: existing.id },
            data: { isHelpful: input.isHelpful },
          });
          await updateVoteCounts(ctx.db, input.reviewId);
        }
        return { changed: existing.isHelpful !== input.isHelpful };
      }

      await ctx.db.reviewVote.create({
        data: {
          reviewId: input.reviewId,
          isHelpful: input.isHelpful,
          userId: input.userId,
          ipAddress: input.ipAddress,
        },
      });
      await updateVoteCounts(ctx.db, input.reviewId);
      return { changed: true };
    }),

  // ── Customer Submitted ───────────────────────────────────────────────────

  canReview: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });
      if (!user) return { canReview: false, reason: "User not found" };

      const existing = await ctx.db.productReview.findFirst({
        where: {
          productId: input.productId,
          customerEmail: user.email,
          source: "customer",
        },
      });
      if (existing)
        return {
          canReview: false,
          reason: "You have already reviewed this product",
        };

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { businessId: true },
      });
      if (!product) return { canReview: false, reason: "Product not found" };

      const order = await ctx.db.order.findFirst({
        where: {
          businessId: product.businessId,
          customerEmail: user.email,
          items: { some: { productId: input.productId } },
        },
        select: { id: true },
      });

      return { canReview: true, verifiedPurchase: !!order, orderId: order?.id };
    }),

  submit: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        rating: z.number().min(1).max(5),
        title: z.string().min(1).max(200),
        comment: z.string().min(10).max(2000),
        images: z.array(z.string().url()).max(5).optional(),
        videoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, name: true },
      });
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });

      const existing = await ctx.db.productReview.findFirst({
        where: {
          productId: input.productId,
          customerEmail: user.email,
          source: "customer",
        },
      });
      if (existing)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already reviewed this product",
        });

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { businessId: true },
      });
      if (!product)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });

      const order = await ctx.db.order.findFirst({
        where: {
          businessId: product.businessId,
          customerEmail: user.email,
          items: { some: { productId: input.productId } },
        },
        select: { id: true },
      });

      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: product.businessId,
            email: user.email,
          },
        },
        create: {
          businessId: product.businessId,
          email: user.email,
          firstName: user.name?.split(" ")[0],
          lastName: user.name?.split(" ").slice(1).join(" "),
        },
        update: {},
      });

      const review = await ctx.db.productReview.create({
        data: {
          source: "customer",
          productId: input.productId,
          customerId: customer.id,
          customerEmail: user.email,
          customerName: user.name ?? user.email,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          images: input.images ?? [],
          videoUrl: input.videoUrl,
          verifiedPurchase: !!order,
          orderId: order?.id,
          isApproved: false, // always needs approval
        },
      });

      await updateProductStats(ctx.db, input.productId);
      return review;
    }),

  // ── Owner Created ────────────────────────────────────────────────────────

  ownerCreate: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        customerName: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerTitle: z.string().optional(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        comment: z.string().min(1),
        images: z.array(z.string().url()).max(5).optional(),
        videoUrl: z.string().url().optional(),
        verifiedPurchase: z.boolean().default(false),
        isApproved: z.boolean().default(true),
        reviewDate: z.string().optional(), // ISO string for backdating
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: { businessId: true },
      });
      if (!product)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });

      await assertBusinessOwner(
        ctx.db,
        ctx.session.user.id,
        product.businessId,
      );

      const { reviewDate, ...rest } = input;

      const review = await ctx.db.productReview.create({
        data: {
          ...rest,
          source: "owner",
          images: input.images ?? [],
          reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
        },
      });

      await updateProductStats(ctx.db, input.productId);
      return review;
    }),

  ownerUpdate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        customerName: z.string().min(1).optional(),
        customerEmail: z.string().email().optional().nullable(),
        customerTitle: z.string().optional().nullable(),
        rating: z.number().min(1).max(5).optional(),
        title: z.string().optional().nullable(),
        comment: z.string().min(1).optional(),
        images: z.array(z.string().url()).max(5).optional(),
        videoUrl: z.string().url().optional().nullable(),
        verifiedPurchase: z.boolean().optional(),
        isApproved: z.boolean().optional(),
        reviewDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, reviewDate, ...rest } = input;
      const review = await getReviewAndAssertOwner(
        ctx.db,
        ctx.session.user.id,
        id,
      );

      if (review.source !== "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only owner-created reviews can be edited",
        });
      }

      const updated = await ctx.db.productReview.update({
        where: { id },
        data: {
          ...rest,
          ...(reviewDate && { reviewDate: new Date(reviewDate) }),
        },
      });

      await updateProductStats(ctx.db, review.productId);
      return updated;
    }),

  // ── Admin (both types) ───────────────────────────────────────────────────

  // List all reviews for a business across all products
  listAll: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        status: z.enum(["pending", "approved", "hidden", "all"]).default("all"),
        source: z.enum(["customer", "owner", "all"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertBusinessOwner(ctx.db, ctx.session.user.id, input.businessId);

      const where: Prisma.ProductReviewWhereInput = {
        product: { businessId: input.businessId },
      };

      if (input.status === "pending") {
        where.isApproved = false;
        where.isHidden = false;
      }
      if (input.status === "approved") {
        where.isApproved = true;
        where.isHidden = false;
      }
      if (input.status === "hidden") {
        where.isHidden = true;
      }
      if (input.source !== "all") {
        where.source = input.source;
      }

      return ctx.db.productReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      });
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string(), isApproved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const review = await getReviewAndAssertOwner(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );
      const updated = await ctx.db.productReview.update({
        where: { id: input.id },
        data: { isApproved: input.isApproved },
      });
      await updateProductStats(ctx.db, review.productId);
      return updated;
    }),

  toggleHidden: protectedProcedure
    .input(z.object({ id: z.string(), isHidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const review = await getReviewAndAssertOwner(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );
      const updated = await ctx.db.productReview.update({
        where: { id: input.id },
        data: { isHidden: input.isHidden },
      });
      await updateProductStats(ctx.db, review.productId);
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const review = await getReviewAndAssertOwner(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );
      await ctx.db.productReview.delete({ where: { id: input.id } });
      await updateProductStats(ctx.db, review.productId);
      return { success: true };
    }),
});
