import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { isValidDomain } from "~/lib/utils";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const domainRouter = createTRPCRouter({
  add: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: domain }) => {
      if (!isValidDomain(domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain",
        });
      }

      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Check if domain is already taken
      const existingDomain = await ctx.db.business.findFirst({
        where: {
          customDomain: domain,
          id: { not: business.id },
        },
      });

      if (existingDomain) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This domain is already in use",
        });
      }

      // Update business with custom domain
      await ctx.db.business.update({
        where: { id: business.id },
        data: {
          customDomain: domain,
          domainStatus: "PENDING_DNS",
        },
      });

      // Add to domain queue for Coolify
      await ctx.db.domainQueue.create({
        data: {
          domain,
          businessId: business.id,
          status: "pending",
        },
      });

      // TODO: Send notification to admin to add domain to Coolify
      // This could be an email, Slack message, or webhook

      return {
        success: true,
        domain,
        status: "PENDING_DNS",
      };
    }),

  verify: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: domain }) => {
      const currentBusiness = await checkBusiness();
      if (!currentBusiness) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Verify this domain belongs to this business
      const business = await ctx.db.business.findFirst({
        where: {
          id: currentBusiness.id,
          customDomain: domain,
        },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found for your business",
        });
      }

      // Check DNS records
      const vpsIp = process.env.VPS_IP;

      if (!vpsIp) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "VPS IP not configured",
        });
      }

      // Use DNS lookup to check if domain points to our VPS
      const dns = await import("dns").then((m) => m.promises);

      try {
        const addresses = await dns.resolve4(domain);
        const pointsToUs = addresses.includes(vpsIp);

        if (pointsToUs) {
          // DNS is configured correctly!
          // Update business status
          await ctx.db.business.update({
            where: { id: currentBusiness.id },
            data: { domainStatus: "ACTIVE" },
          });

          // Update domain queue
          await ctx.db.domainQueue.updateMany({
            where: {
              domain,
              businessId: currentBusiness.id,
            },
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
        // DNS lookup failed - domain not configured yet
        console.error("DNS lookup failed:", dnsError);
        return {
          verified: false,
          message: "DNS records not found. Please check your configuration.",
        };
      }
    }),
});
