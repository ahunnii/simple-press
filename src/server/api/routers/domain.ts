import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { notifySlackNewDomain } from "~/lib/slack/notification";
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

      // Message to slack notifying of new domain to add to Coolify (NEED TO ADD AUTOMATIC PROCESSING TO ADD TO COOLIFY)
      await notifySlackNewDomain(domain, businessId);

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

      // Check DNS records
      const vpsIp = env.VPS_IP;

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
            where: { id: businessId },
            data: { domainStatus: "ACTIVE" },
          });

          // Update domain queue
          await ctx.db.domainQueue.updateMany({
            where: {
              domain,
              businessId,
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
