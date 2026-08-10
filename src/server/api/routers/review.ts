import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient, TxClient } from "~/server/db";
import { checkBusiness } from "~/lib/check-business";
import { splitCustomerName } from "~/lib/customer-name";
import { getClientIpFromHeaders, reviewVoteLimiter } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import {
  reviewBulkApproveSchema,
  reviewBulkDeleteSchema,
  reviewBulkHideSchema,
} from "~/lib/validators/reviews";

import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function assertBusinessOwner(
  db: DbClient,
  userId: string,
  businessId: string,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { memberships: true, platformRole: true },
  });

  if (user?.platformRole === "PLATFORM_ADMIN") {
    return;
  }

  // Review moderation/authoring touches store content, so it must be limited to
  // OWNER/MANAGER — STAFF (fulfillment-only) must not approve/hide/delete or
  // author reviews. A bare membership check would let any role through.
  const membership = user?.memberships.find((m) => m.businessId === businessId);
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
}

async function getReviewAndAssertOwner(
  db: DbClient,
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

// Takes `TxClient`, not `DbClient`, so it can run either standalone or inside a
// `$transaction` callback (the bulk mutations recompute stats in-transaction).
// `DbClient` is structurally assignable to `TxClient`, so plain `ctx.db` callers
// still work unchanged.
async function updateProductStats(db: TxClient, productId: string) {
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

async function updateVoteCounts(db: DbClient, reviewId: string) {
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

export const reviewRouter = createTRPCRouter({
  listByProduct: publicProcedure
    .use(featureGate("reviews"))
    .input(
      z.object({
        productId: z.string(),
        sortBy: z
          .enum(["recent", "helpful", "rating_high", "rating_low"])
          .default("recent"),
        rating: z.number().min(1).max(5).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

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
          product: { businessId: business.id },
          // Public storefront listing: NEVER trust a client flag to widen
          // visibility. Unapproved/hidden reviews are owner-only via `listAll`.
          isApproved: true,
          isHidden: false,
          ...(input.rating && { rating: input.rating }),
        },
        orderBy: orderBy[input.sortBy],
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  getProductStats: publicProcedure
    .use(featureGate("reviews"))
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const reviews = await ctx.db.productReview.findMany({
        where: {
          productId: input.productId,
          product: { businessId: business.id },
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
    .use(featureGate("reviews"))
    .input(
      z.object({
        reviewId: z.string(),
        isHelpful: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ip = `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`;
      try {
        await reviewVoteLimiter.consume(ip);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many votes. Please try again later.",
        });
      }

      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const userId = ctx.session?.user.id ?? null;

      // Confirm the review belongs to the resolved business before touching any
      // vote. Without this, the create path below would let a caller cast a vote
      // on another tenant's review id (the update path is already scoped via the
      // `review.product.businessId` join on `existing`).
      const review = await ctx.db.productReview.findFirst({
        where: {
          id: input.reviewId,
          product: { businessId: business.id },
        },
        select: { id: true },
      });
      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const existing = await ctx.db.reviewVote.findFirst({
        where: {
          reviewId: input.reviewId,
          review: { product: { businessId: business.id } },
          OR: [...(userId ? [{ userId }] : []), { ipAddress: ip }],
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
          userId,
          ipAddress: ip,
        },
      });
      await updateVoteCounts(ctx.db, input.reviewId);
      return { changed: true };
    }),

  // ── Customer Submitted ───────────────────────────────────────────────────

  canReview: protectedProcedure
    .use(featureGate("reviews"))
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });
      if (!user) return { canReview: false, reason: "User not found" };

      // Reviews store `normalizeEmail()`; normalize here too so a mixed-case
      // email doesn't wrongly report the product as un-reviewed.
      const normalizedUserEmail = normalizeEmail(user.email);

      const existing = await ctx.db.productReview.findFirst({
        where: {
          productId: input.productId,
          customerEmail: normalizedUserEmail,
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
          customerEmail: normalizedUserEmail,
          items: { some: { productId: input.productId } },
        },
        select: { id: true },
      });

      return { canReview: true, verifiedPurchase: !!order, orderId: order?.id };
    }),

  submit: protectedProcedure
    .use(featureGate("reviews"))
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

      // Reviews store `normalizeEmail()`, so the dedupe query must normalize too —
      // otherwise a mixed-case sign-in email bypasses the one-review-per-product
      // guard.
      const normalizedUserEmail = normalizeEmail(user.email);

      const existing = await ctx.db.productReview.findFirst({
        where: {
          productId: input.productId,
          customerEmail: normalizedUserEmail,
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
          customerEmail: normalizedUserEmail,
          items: { some: { productId: input.productId } },
        },
        select: { id: true },
      });

      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: product.businessId,
            email: normalizedUserEmail,
          },
        },
        create: {
          businessId: product.businessId,
          email: normalizedUserEmail,
          // Stores NULL, not "", for a missing half — see splitCustomerName.
          ...splitCustomerName(user.name),
        },
        update: {},
      });

      const review = await ctx.db.productReview.create({
        data: {
          source: "customer",
          productId: input.productId,
          customerId: customer.id,
          customerEmail: normalizedUserEmail,
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
    .use(featureGate("reviews"))
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
    .use(featureGate("reviews"))
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
  //
  // NOTE: every moderation procedure below — listAll, approve, toggleHidden,
  // delete, bulkSetApproved, bulkSetHidden, bulkDelete — is intentionally left
  // ungated by featureGate("reviews"). Owners must still be able to
  // moderate/hide/delete pre-existing reviews after disabling the reviews
  // feature — otherwise turning the flag off would trap stale or reported
  // reviews with no way to clean them up. This is a deliberate divergence from
  // the testimonials router, whose bulk procedures ARE gated by
  // featureGate("testimonials"); do not "fix" the inconsistency by adding a
  // gate here. Only the customer/storefront-facing procedures above (which
  // create new reviews or render them publicly) are gated.
  //
  // Tenancy note: ProductReview has no businessId column — it is reachable
  // only through the product relation. EVERY where clause here (including
  // reads inside transactions, updateMany and deleteMany) must therefore carry
  // `product: { businessId }`. Omitting it on any single query is a
  // cross-tenant read or write.

  // List all reviews for a business across all products. Input-free on
  // purpose: the admin page filters, sorts and paginates in memory, so the
  // router just ships the full tenant-scoped set.
  listAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    return ctx.db.productReview.findMany({
      where: { product: { businessId } },
      // Stable transport order (reviewDate ties broken by id); the page
      // re-sorts in memory according to its own sort param.
      orderBy: [{ reviewDate: "desc" }, { id: "asc" }],
      // Explicit select rather than a full row + include: this trims
      // updatedAt, notHelpfulCount, customerId and orderId, none of which the
      // table or the owner-review dialog reads. createdAt stays because the
      // dialog's buildDefaultValues falls back to it when reviewDate is unset.
      select: {
        id: true,
        source: true,
        rating: true,
        title: true,
        comment: true,
        images: true,
        videoUrl: true,
        verifiedPurchase: true,
        isApproved: true,
        isHidden: true,
        customerName: true,
        customerEmail: true,
        customerTitle: true,
        reviewDate: true,
        createdAt: true,
        helpfulCount: true,
        productId: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  }),

  approve: ownerAdminProcedure
    .input(z.object({ id: z.string(), isApproved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Declarative tenancy: findFirst scoped through the product relation
      // replaces the old getReviewAndAssertOwner round-trip. Same policy —
      // assertBusinessOwner admitted exactly OWNER/MANAGER/PLATFORM_ADMIN,
      // which is ownerAdminProcedure's definition.
      const review = await ctx.db.productReview.findFirst({
        where: { id: input.id, product: { businessId } },
        select: { productId: true },
      });
      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }

      const updated = await ctx.db.productReview.update({
        where: { id: input.id },
        data: { isApproved: input.isApproved },
      });
      await updateProductStats(ctx.db, review.productId);
      return updated;
    }),

  toggleHidden: ownerAdminProcedure
    .input(z.object({ id: z.string(), isHidden: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const review = await ctx.db.productReview.findFirst({
        where: { id: input.id, product: { businessId } },
        select: { productId: true },
      });
      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }

      const updated = await ctx.db.productReview.update({
        where: { id: input.id },
        data: { isHidden: input.isHidden },
      });
      await updateProductStats(ctx.db, review.productId);
      return updated;
    }),

  delete: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // productId must be read BEFORE the delete — the row is gone afterwards.
      const review = await ctx.db.productReview.findFirst({
        where: { id: input.id, product: { businessId } },
        select: { productId: true },
      });
      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }

      await ctx.db.productReview.delete({ where: { id: input.id } });
      await updateProductStats(ctx.db, review.productId);
      return { success: true };
    }),

  // ─── BULK MUTATIONS ───────────────────────────────────────────────────────

  bulkSetApproved: ownerAdminProcedure
    .input(reviewBulkApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with `isApproved` inverted is not an inverse: a
      // selection containing already-approved rows approves all of them, then
      // "Undo" unapproves all of them — including the ones the user never
      // touched. The client can't narrow it either (a selection spans pages,
      // and off-page rows' `isApproved` state never reaches the browser).
      //
      // The same set is also exactly which products need a stats recompute:
      // a row already in the target state can't change any product's
      // approved-and-visible aggregate.
      //
      // One transaction so nothing can change between the read and the update.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.productReview.findMany({
          where: {
            id: { in: input.ids },
            product: { businessId },
            isApproved: { not: input.isApproved },
          },
          select: { id: true, productId: true },
        });

        const result = await tx.productReview.updateMany({
          where: { id: { in: input.ids }, product: { businessId } },
          data: { isApproved: input.isApproved },
        });

        // Recompute inside the same tx, after the write (tx reads see tx
        // writes), via the shared helper so there is exactly one definition of
        // "counts toward a product's stats".
        const productIds = [...new Set(changed.map((r) => r.productId))];
        for (const productId of productIds) {
          await updateProductStats(tx, productId);
        }

        return { changedIds: changed.map((r) => r.id), count: result.count };
      });

      return { count, changedIds };
    }),

  bulkSetHidden: ownerAdminProcedure
    .input(reviewBulkHideSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Same undo contract as `bulkSetApproved` above: `changedIds` is read
      // inside the transaction, before the write, and is the only valid Undo
      // target — and the same set drives the stats recompute.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.productReview.findMany({
          where: {
            id: { in: input.ids },
            product: { businessId },
            isHidden: { not: input.isHidden },
          },
          select: { id: true, productId: true },
        });

        const result = await tx.productReview.updateMany({
          where: { id: { in: input.ids }, product: { businessId } },
          data: { isHidden: input.isHidden },
        });

        const productIds = [...new Set(changed.map((r) => r.productId))];
        for (const productId of productIds) {
          await updateProductStats(tx, productId);
        }

        return { changedIds: changed.map((r) => r.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // OWNER only, unlike the two bulk toggles above. Not a statement about
  // trusting managers — it's blast radius. Approve/hide is reversible in one
  // click (and Undo-able); deleting N reviews is unrecoverable without a
  // database restore, and it permanently rewrites the affected products' live
  // star ratings and review counts on the storefront. Same reason the schema's
  // delete cap (ADMIN_BULK_DELETE_LIMIT) sits far below the selection cap the
  // toggles use.
  //
  // Unlike `testimonial.bulkDelete` this one needs a transaction: product
  // stats must be recomputed from post-delete state, so the delete and the
  // recompute have to be atomic.
  bulkDelete: ownerOnlyProcedure
    .input(reviewBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const count = await ctx.db.$transaction(async (tx) => {
        // Read productIds BEFORE the delete — the rows won't exist afterwards.
        const rows = await tx.productReview.findMany({
          where: { id: { in: input.ids }, product: { businessId } },
          select: { productId: true },
        });

        const result = await tx.productReview.deleteMany({
          where: { id: { in: input.ids }, product: { businessId } },
        });

        const productIds = [...new Set(rows.map((r) => r.productId))];
        for (const productId of productIds) {
          // Runs after deleteMany, so the helper sees post-delete state.
          await updateProductStats(tx, productId);
        }

        return result.count;
      });

      return { count };
    }),
});
