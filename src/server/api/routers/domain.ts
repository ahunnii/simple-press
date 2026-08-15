import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import {
  notifyDiscordDomainRemoved,
  notifyDiscordNewDomain,
} from "~/lib/discord/notification";
import { isValidDomain } from "~/lib/utils";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

export const domainRouter = createTRPCRouter({
  add: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: domain }) => {
      const { businessId } = ctx;

      if (!isValidDomain(domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain",
        });
      }

      // Reject the platform's own domain and any of its subdomains
      // (e.g. `*.simplepress.co`). A tenant claiming these as a custom domain
      // would let them hijack platform/other-tenant traffic during routing.
      const platformDomain =
        env.NEXT_PUBLIC_PLATFORM_DOMAIN.trim().toLowerCase();
      const normalizedDomain = domain.trim().toLowerCase();
      if (
        platformDomain &&
        (normalizedDomain === platformDomain ||
          normalizedDomain.endsWith(`.${platformDomain}`))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "That domain is reserved by the platform and cannot be used as a custom domain",
        });
      }

      // Check if domain is already taken
      const existingDomain = await ctx.db.business.findFirst({
        where: {
          customDomain: domain,
          id: { not: businessId },
        },
      });

      if (existingDomain) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This domain is already in use",
        });
      }

      // Fetch business details for notification
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          subdomain: true,
          ownerEmail: true,
        },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Update business with custom domain
      await ctx.db.business.update({
        where: { id: businessId },
        data: {
          customDomain: domain,
          domainStatus: "PENDING_DNS",
        },
      });

      // Add to domain queue for Coolify
      await ctx.db.domainQueue.create({
        data: {
          domain,
          businessId,
          status: "pending",
        },
      });

      // Notify Discord with full business context
      try {
        await notifyDiscordNewDomain({
          domain,
          businessName: business.name,
          businessId,
          subdomain: business.subdomain,
          ownerEmail: business.ownerEmail,
        });
      } catch (err) {
        Sentry.captureException(err, {
          tags: { service: "discord", "trpc.procedure": "domain.add" },
        });
      }

      return {
        success: true,
        domain,
        status: "PENDING_DNS",
      };
    }),

  verify: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: domain }) => {
      const { businessId } = ctx;

      const vpsIp = env.VPS_IP;

      if (!vpsIp) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "VPS IP not configured",
        });
      }

      // Only verify the domain the business actually configured. Without this a
      // caller could pass an arbitrary domain that happens to point at our VPS
      // (e.g. another tenant's) and flip THIS business to ACTIVE.
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { customDomain: true },
      });

      if (!business?.customDomain || business.customDomain !== domain) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Domain does not match the configured custom domain",
        });
      }

      const dns = await import("dns").then((m) => m.promises);

      try {
        const addresses = await dns.resolve4(domain);
        const pointsToUs = addresses.includes(vpsIp);

        if (pointsToUs) {
          await ctx.db.business.update({
            where: { id: businessId },
            data: { domainStatus: "ACTIVE" },
          });

          await ctx.db.domainQueue.updateMany({
            where: { domain, businessId },
            data: { status: "completed" },
          });

          return {
            verified: true,
            message: "Domain verified successfully",
          };
        } else {
          return {
            verified: false,
            message: `Domain points to ${addresses.join(", ")} but should point to ${vpsIp}`,
          };
        }
      } catch (dnsError: unknown) {
        console.error("DNS lookup failed:", dnsError);
        return {
          verified: false,
          message: "DNS records not found. Please check your configuration.",
        };
      }
    }),

  remove: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    const business = await ctx.db.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        subdomain: true,
        ownerEmail: true,
        customDomain: true,
      },
    });

    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    if (!business.customDomain) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No custom domain is configured",
      });
    }

    const removedDomain = business.customDomain;

    // Clear the domain and reset status
    await ctx.db.business.update({
      where: { id: businessId },
      data: {
        customDomain: null,
        domainStatus: "NONE",
      },
    });

    // Mark the queue entry as failed (domain released)
    await ctx.db.domainQueue.updateMany({
      where: { domain: removedDomain, businessId },
      data: { status: "failed" },
    });

    // Notify Discord so admin knows to remove it from Coolify
    try {
      await notifyDiscordDomainRemoved({
        domain: removedDomain,
        businessName: business.name,
        businessId,
        subdomain: business.subdomain,
        ownerEmail: business.ownerEmail,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: "discord", "trpc.procedure": "domain.remove" },
      });
    }

    return { success: true };
  }),
});
