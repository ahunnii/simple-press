import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  discountUsageForCheckout,
  findSupersedableHold,
} from "~/lib/checkout/discount-holds";
import { deactivateExpiredDiscountCodes } from "~/lib/deactivate-expired-discounts";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { countHeldDiscountUses } from "~/lib/inventory/reservation";
import { discountLimiter, getClientIpFromHeaders } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import {
  DISCOUNT_DATE_RANGE_ERROR,
  discountBulkActiveSchema,
  discountBulkDeleteSchema,
  discountFormSchema,
  validateDiscountDateRange,
  validateDiscountValue,
} from "~/lib/validators/discounts";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const discountRouter = createTRPCRouter({
  getAll: ownerAdminProcedure
    .use(featureGate("coupons"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // The admin list table is this procedure's only caller, so the `select`
      // below is the row contract — exactly the ten fields that table renders,
      // filters, or sorts on. It keeps the editor-only columns
      // (perCustomerLimit, minPurchase, maxDiscount) and any future field out
      // of the RSC payload; the detail page reads those through `getById`.
      const codes = await ctx.db.discountCode.findMany({
        // Exclude loyalty-minted codes (source: "loyalty") — they surface
        // per customer on the loyalty admin card, not in this owner-created list.
        where: { businessId, source: "manual" },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          active: true,
          usageLimit: true,
          usageCount: true,
          startsAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      // `usageCount` includes uses held by still-open checkouts (counted at
      // checkout start; given back if the checkout expires or its payment
      // fails). `heldUses` lets the table say so instead of presenting a code
      // that is at its limit only because of a pending bank payment as final.
      const held = await countHeldDiscountUses(ctx.db, {
        businessId,
        discountCodeIds: codes.filter((c) => c.usageCount > 0).map((c) => c.id),
      });
      return codes.map((c) => ({ ...c, heldUses: held.get(c.id) ?? 0 }));
    }),

  getById: ownerAdminProcedure
    .use(featureGate("coupons"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const discount = await ctx.db.discountCode.findFirst({
        where: { id: input.id, businessId },
      });
      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }
      return discount;
    }),

  create: ownerAdminProcedure
    .use(featureGate("coupons"))
    .input(discountFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      if (
        !validateDiscountDateRange({
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
        })
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: DISCOUNT_DATE_RANGE_ERROR,
        });
      }

      const valueCheck = validateDiscountValue(input.type, input.value);
      if (!valueCheck.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: valueCheck.message,
        });
      }

      const existingCode = await ctx.db.discountCode.findFirst({
        where: {
          businessId,
          code: input.code,
        },
      });
      if (existingCode) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A discount code with this code already exists",
        });
      }

      const discount = await ctx.db.discountCode.create({
        data: {
          businessId,
          code: input.code,
          type: input.type,
          value: input.value,
          active: input.active,
          usageLimit: input.usageLimit,
          perCustomerLimit: input.perCustomerLimit,
          startsAt: input.startsAt ?? undefined,
          expiresAt: input.expiresAt ?? undefined,
          minPurchase: input.minPurchase,
          maxDiscount: input.maxDiscount,
        },
      });
      return {
        data: discount,
        message: "Discount code created successfully",
      };
    }),

  update: ownerAdminProcedure
    .use(featureGate("coupons"))
    .input(
      discountFormSchema.extend({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      if (
        !validateDiscountDateRange({
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
        })
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: DISCOUNT_DATE_RANGE_ERROR,
        });
      }

      const valueCheck = validateDiscountValue(input.type, input.value);
      if (!valueCheck.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: valueCheck.message,
        });
      }

      const codeTaken = await ctx.db.discountCode.findFirst({
        where: {
          businessId,
          code: input.code,
          NOT: { id: input.id },
        },
      });
      if (codeTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A discount code with this code already exists",
        });
      }

      // See the note on `delete` below: an unmatched compound `where` throws a
      // raw Prisma P2025, which tRPC reports as INTERNAL_SERVER_ERROR and the
      // error handler forwards to Sentry. Blocked correctly either way — this
      // just makes a cross-tenant or stale id read as the 404 it is.
      const discount = await ctx.db.discountCode
        .update({
          where: { id: input.id, businessId },
          data: {
            code: input.code,
            type: input.type,
            value: input.value,
            active: input.active,
            usageLimit: input.usageLimit ?? null,
            perCustomerLimit: input.perCustomerLimit ?? null,
            startsAt: input.startsAt ?? null,
            expiresAt: input.expiresAt ?? null,
            minPurchase: input.minPurchase ?? null,
            maxDiscount: input.maxDiscount ?? null,
          },
        })
        .catch((error: unknown) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            return null;
          }
          throw error;
        });

      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }

      return { data: discount, message: "Discount code updated successfully" };
    }),

  bulkSetActive: ownerAdminProcedure
    .use(featureGate("coupons"))
    .input(discountBulkActiveSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();

      // Activating an already-expired code is a no-op dressed as success:
      // `deactivateExpiredDiscountCodes` (src/lib/deactivate-expired-discounts.ts)
      // runs on every admin list GET and would flip it straight back to
      // inactive before the owner even sees the refreshed row. So on activate
      // we exclude expired rows from BOTH halves of the transaction — the
      // `changed` read and the `updateMany` — and report how many we skipped.
      // Deactivating is never guarded: turning an expired code off is exactly
      // what the materializer wants anyway.
      //
      // `expiresAt < now` is a raw-instant comparison on purpose. It matches
      // the materializer and `getDiscountStatus` in
      // ~/lib/validators/discounts, and deliberately does NOT match checkout
      // validation (src/lib/discount-validation.ts), which stretches expiry to
      // the end of the calendar day for the shopper. This procedure reports
      // the code's mechanical state, not its redeemability.
      const eligibleWhere = input.active
        ? { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }
        : {};

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with the opposite `active` is not an inverse: a
      // selection containing already-active codes activates all of them, then
      // "Undo" deactivates all of them — including the ones the user never
      // touched. The client can't narrow it either (a selection spans pages,
      // and off-page rows' `active` state never reaches the browser).
      //
      // Two invariants the client's toast grammar depends on:
      //   1. Skipped (expired) rows never appear in `changedIds`, so Undo can
      //      never deactivate a row this call didn't activate.
      //   2. `skippedExpiredCount > 0` implies `count < input.ids.length`,
      //      because every skipped row is also excluded from the updateMany —
      //      so a skip always surfaces through the client's shortfall branch
      //      rather than hiding inside a clean success toast.
      //
      // One transaction so nothing can change between the count, the read and
      // the update.
      const { changedIds, count, skippedExpiredCount } =
        await ctx.db.$transaction(async (tx) => {
          const skipped = input.active
            ? await tx.discountCode.count({
                where: {
                  id: { in: input.ids },
                  businessId,
                  expiresAt: { lt: now },
                },
              })
            : 0;

          const changed = await tx.discountCode.findMany({
            where: {
              id: { in: input.ids },
              businessId,
              active: { not: input.active },
              ...eligibleWhere,
            },
            select: { id: true },
          });

          const result = await tx.discountCode.updateMany({
            where: { id: { in: input.ids }, businessId, ...eligibleWhere },
            data: { active: input.active },
          });

          return {
            changedIds: changed.map((d) => d.id),
            count: result.count,
            skippedExpiredCount: skipped,
          };
        });

      // `skippedExpiredCount` is always a number — 0 on deactivate — so the
      // client never has to branch on undefined.
      return { count, changedIds, skippedExpiredCount };
    }),

  // OWNER only, unlike bulkSetActive next door. Not a statement about trusting
  // managers — it's blast radius. Activate/deactivate is reversible in one
  // click; deleting N discount codes at once is not, and an escalated
  // "select all N matching" selection makes a single mis-click unrecoverable
  // without a database restore. The blast radius here is lower than
  // Collections' (`Order.discountCode` is `onDelete: SetNull`, so past orders
  // keep their own record of what was applied), but delete stays owner-only
  // per the platform standard. Same reason the schema's delete cap
  // (ADMIN_BULK_DELETE_LIMIT) sits far below the selection cap.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("coupons"))
    .input(discountBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.discountCode.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  deactivateExpired: ownerAdminProcedure
    .use(featureGate("coupons"))
    .mutation(async ({ ctx }) => {
      const { businessId } = ctx;
      return deactivateExpiredDiscountCodes(ctx.db, businessId);
    }),

  validate: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("coupons"))
    .input(
      z.object({
        code: z.string().min(1),
        cartTotal: z.number().int().min(0),
        // Optional: when the checkout form knows the shopper's email, pass it
        // so per-customer limits can be enforced early. create-session enforces
        // this authoritatively either way.
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await discountLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.businessId}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      const { businessId } = ctx;
      const { cartTotal } = input;

      const discount = await ctx.db.discountCode.findFirst({
        where: {
          code: input.code.trim().toUpperCase(),
          businessId,
        },
      });

      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }

      // Agree with what create-session will decide, through the same helper:
      //
      // - Uses held by open checkouts count (they are inside `usageCount`;
      //   per customer, the shopper's held uses are added to their orders).
      // - EXCEPT the hold of the shopper's own previous checkout (the signed
      //   `pending_session` cookie) when create-session would supersede it —
      //   an active reservation of this store for that session, still open
      //   on Stripe — because create-session gives that use back before
      //   claiming a new one. Without this, a shopper who pressed Back
      //   from Stripe and re-enters their single-use (e.g. loyalty reward)
      //   code is told it has reached its usage limit by their own checkout.
      //
      // Per-customer is only enforceable here when the form supplied an email;
      // create-session re-checks it with the checkout email either way.
      // The lookup is DB-first (a Stripe retrieve only when such a hold
      // exists), and only runs when a limit could actually reject the code.
      const customerEmail = input.email
        ? normalizeEmail(input.email)
        : undefined;
      const limited =
        discount.usageLimit != null ||
        (discount.perCustomerLimit != null && customerEmail !== undefined);
      const excludeReservationId = limited
        ? await findSupersedableHold(ctx.db, {
            headers: ctx.headers,
            businessId,
            discountCodeId: discount.id,
          })
        : null;
      const usage = await discountUsageForCheckout(ctx.db, {
        businessId,
        discount,
        customerEmail,
        excludeReservationId,
      });

      // Shipping isn't known at validate time, so a free_shipping code
      // reports discountAmount 0 — the `freeShipping` flag tells the UI to
      // show a "Free shipping" label instead of a dollar amount.
      const result = validateAndComputeDiscount(
        { ...discount, usageCount: usage.usageCount },
        cartTotal,
        { customerUsageCount: usage.customerUsageCount },
      );
      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error,
        });
      }

      return {
        valid: true,
        discount: {
          id: discount.id,
          code: discount.code,
          type: discount.type,
          value: discount.value,
          discountAmount: result.discountAmountCents,
          freeShipping: discount.type === "free_shipping",
        },
      };
    }),

  delete: ownerAdminProcedure
    .use(featureGate("coupons"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      // The compound `where` already prevents touching another tenant's row,
      // but an unmatched delete throws a raw Prisma P2025 that tRPC turns into
      // INTERNAL_SERVER_ERROR — a 500 for what is really a 404, and one that
      // the tRPC error handler reports to Sentry as a server bug on every
      // stale-id click. Convert it, the same way faq.ts does.
      const discount = await ctx.db.discountCode
        .delete({ where: { id, businessId } })
        .catch((error: unknown) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            return null;
          }
          throw error;
        });

      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }

      return { data: discount, message: "Discount code deleted successfully" };
    }),
});
