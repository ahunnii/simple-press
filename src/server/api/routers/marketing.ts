import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import { z } from "zod";

import { sendMarketingBroadcast } from "~/lib/email/templates";
import { createUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { getBusinessUrl } from "~/lib/business-url";

import { createTRPCRouter, featureGate, ownerAdminProcedure } from "../trpc";

// Resend's send endpoint is rate-limited (~2 req/s on lower plans). We send in
// small concurrent batches with a pause between them to stay under that ceiling.
// NOTE (v1 limitation): for very large opt-in lists this loop runs for a while
// inside the request. Tiny-shop lists (tens to low hundreds) complete in
// seconds; true bulk sending should move to a background job in a future pass.
const CHUNK_SIZE = 2;
const CHUNK_DELAY_MS = 1000;

export const marketingRouter = createTRPCRouter({
  /**
   * Returns the count of opted-in, non-anonymized customers for this business.
   * No featureGate here — the page needs this to show the audience size even
   * before the owner enables the feature.
   */
  listRecipients: ownerAdminProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.customer.count({
      where: {
        businessId: ctx.businessId,
        acceptsMarketing: true,
        anonymizedAt: null,
        NOT: { email: "" },
      },
    });
    return { count };
  }),

  /**
   * Export the opted-in marketing list as a CSV. Like listRecipients, this is
   * not featureGated — the owner's opt-in list is their data regardless of
   * whether the broadcast feature is enabled.
   */
  exportRecipients: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    const customers = await ctx.db.customer.findMany({
      where: {
        businessId,
        acceptsMarketing: true,
        anonymizedAt: null,
        NOT: { email: "" },
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        orderCount: true,
        totalSpent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (customers.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No opted-in customers to export",
      });
    }

    const rows = customers.map((c) => ({
      Email: c.email,
      "First Name": c.firstName ?? "",
      "Last Name": c.lastName ?? "",
      "Order Count": c.orderCount,
      "Total Spent": (c.totalSpent / 100).toFixed(2),
      "Customer Since": c.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(rows, { quotes: true, header: true });

    const business = await ctx.db.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });

    const slug = (business?.name ?? "store").toLowerCase().replace(/\s+/g, "-");
    const date = new Date().toISOString().split("T")[0];

    return {
      csv,
      filename: `marketing-list-${slug}-${date}.csv`,
      count: customers.length,
    };
  }),

  /**
   * Send a one-off marketing broadcast to all opted-in customers.
   * Pass testOnly: true to send a single test email to the owner instead.
   */
  sendBroadcast: ownerAdminProcedure
    .use(featureGate("emailMarketing"))
    .input(
      z.object({
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        testOnly: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          ownerEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      const baseUrl = getBusinessUrl({
        subdomain: business.subdomain,
        customDomain: business.customDomain,
        domainStatus: business.domainStatus,
      });

      // ── Test send ────────────────────────────────────────────────────────────
      if (input.testOnly) {
        const ownerEmail = business.ownerEmail ?? ctx.session.user.email;
        if (!ownerEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No owner email address found to send the test to.",
          });
        }

        const result = await sendMarketingBroadcast({
          to: ownerEmail,
          subject: `[TEST] ${input.subject}`,
          business,
          body: input.body,
          // Placeholder unsubscribe URL for test sends
          unsubscribeUrl: `${baseUrl}/api/unsubscribe?t=test`,
        });

        return { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1, test: true };
      }

      // ── Real broadcast ───────────────────────────────────────────────────────
      const customers = await ctx.db.customer.findMany({
        where: {
          businessId,
          acceptsMarketing: true,
          anonymizedAt: null,
          NOT: { email: "" },
        },
        select: { id: true, email: true },
      });

      let sent = 0;
      let failed = 0;

      for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
        const chunk = customers.slice(i, i + CHUNK_SIZE);

        await Promise.all(
          chunk.map(async (customer) => {
            try {
              const token = createUnsubscribeToken({
                customerId: customer.id,
                businessId,
              });
              const unsubscribeUrl = `${baseUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;

              const result = await sendMarketingBroadcast({
                to: customer.email,
                subject: input.subject,
                business,
                body: input.body,
                unsubscribeUrl,
              });

              if (result.success) {
                sent++;
              } else {
                failed++;
              }
            } catch (err) {
              failed++;
              Sentry.captureException(err, {
                tags: {
                  "marketing.broadcast": "send_error",
                  businessId,
                },
                extra: { customerId: customer.id },
              });
            }
          }),
        );

        // Delay between chunks — skip after the final chunk
        if (i + CHUNK_SIZE < customers.length) {
          await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
        }
      }

      return { sent, failed, test: false };
    }),
});
