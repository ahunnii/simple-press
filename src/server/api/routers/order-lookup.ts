import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getBusinessUrl } from "~/lib/business-url";
import { checkBusiness } from "~/lib/check-business";
import { sendOrderStatusLink } from "~/lib/email/templates";
import { createOrderStatusToken } from "~/lib/order-status-token";
import { getClientIpFromHeaders, orderLookupLimiter } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const orderLookupRouter = createTRPCRouter({
  /**
   * Guest order-status link request.
   *
   * ALWAYS returns `{ success: true }` regardless of whether an order
   * matched, so this endpoint cannot be used to enumerate which emails
   * or order numbers exist on a store.
   */
  requestLink: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email(),
        orderNumber: z.coerce.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await orderLookupLimiter.consume(
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

      const normalizedEmail = normalizeEmail(input.email);

      const order = await db.order.findFirst({
        where: {
          businessId: business.id,
          orderNumber: input.orderNumber,
          customerEmail: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: {
          id: true,
          orderNumber: true,
          customerEmail: true,
          customerName: true,
        },
      });

      if (!order) {
        return { success: true };
      }

      const businessData = await db.business.findUnique({
        where: { id: business.id },
        select: {
          name: true,
          ownerEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!businessData) {
        return { success: true };
      }

      const businessUrl = getBusinessUrl(businessData);
      const orderStatusUrl = `${businessUrl}/order-status/${createOrderStatusToken(order.id)}`;

      try {
        await sendOrderStatusLink({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? "there",
          orderStatusUrl,
          business: {
            name: businessData.name,
            ownerEmail: businessData.ownerEmail,
            siteContent: businessData.siteContent,
            subdomain: businessData.subdomain,
          },
        });
      } catch (emailError) {
        // Never leak whether an order matched — log and return success.
        console.error(
          "[OrderLookup] Failed to send order-status link email:",
          emailError,
        );
        Sentry.captureException(emailError, {
          tags: {
            "trpc.procedure": "orderLookup.requestLink",
            "email.type": "order-status-link",
          },
        });
      }

      return { success: true };
    }),
});
