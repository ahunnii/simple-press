import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { backInStockLimiter, getClientIpFromHeaders } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import {
  createTRPCRouter,
  featureGate,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

export const backInStockRouter = createTRPCRouter({
  /**
   * Guest "notify me when back in stock" signup.
   *
   * ALWAYS returns `{ success: true }` — regardless of whether the product
   * matched or a request already existed — so the endpoint cannot be used to
   * probe which products/emails exist on a store.
   */
  subscribe: publicProcedure
    .use(featureGate("backInStock"))
    .input(
      z.object({
        email: z.string().trim().email(),
        productId: z.string().min(1),
        variantId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await backInStockLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      const business = await checkBusiness();
      if (!business) {
        // No storefront resolved for this host — same opaque response.
        return { success: true };
      }

      // The product must belong to this business and be published.
      const product = await db.product.findFirst({
        where: {
          id: input.productId,
          businessId: business.id,
          published: true,
        },
        select: { id: true },
      });
      if (!product) {
        return { success: true };
      }

      // If a variant was specified it must belong to the product.
      let variantId: string | null = null;
      if (input.variantId) {
        const variant = await db.productVariant.findFirst({
          where: { id: input.variantId, productId: product.id },
          select: { id: true },
        });
        if (!variant) {
          return { success: true };
        }
        variantId = variant.id;
      }

      const email = normalizeEmail(input.email);

      // Dedup: one pending request per email + product + variant + business.
      const existing = await db.backInStockRequest.findFirst({
        where: {
          businessId: business.id,
          productId: product.id,
          variantId,
          email: { equals: email, mode: "insensitive" },
          notifiedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        return { success: true };
      }

      try {
        await db.backInStockRequest.create({
          data: {
            email,
            productId: product.id,
            variantId,
            businessId: business.id,
          },
        });
      } catch (err) {
        // A concurrent duplicate request can slip past the findFirst dedupe and
        // trip the partial unique index on (businessId, productId, variantId,
        // email) WHERE notifiedAt IS NULL. That's a true duplicate pending
        // signup — treat it as an idempotent success (the endpoint always
        // returns opaquely). Already-NOTIFIED rows are outside the partial
        // index, so a legitimate re-subscribe after a notification creates a
        // fresh pending row and never lands here.
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          )
        ) {
          throw err;
        }
      }

      return { success: true };
    }),
});
