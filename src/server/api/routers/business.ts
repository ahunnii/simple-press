import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { z } from "zod";
import { checkBusiness } from "~/lib/check-business";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const businessRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z
        .object({
          productNumber: z.number().optional(),
          includeProducts: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const headersList = await headers();
      const hostname = headersList.get("host") ?? "";

      // Extract subdomain or custom domain
      const domain = hostname.split(":")[0]; // Remove port

      const business = await ctx.db.business.findFirst({
        where: {
          OR: [
            { customDomain: domain },
            { subdomain: domain?.split(".")[0] }, // Extract subdomain
          ],
          status: "active",
        },
        include: {
          siteContent: true,

          ...(input?.includeProducts
            ? {
                products: {
                  where: { published: true },
                  include: {
                    images: {
                      orderBy: { sortOrder: "asc" },
                      take: 1,
                    },
                  },
                  orderBy: { createdAt: "desc" },
                  ...(input?.productNumber
                    ? { take: input.productNumber }
                    : {}),
                },
              }
            : {}),
        },
      });
      return business;
    }),

  updateBranding: ownerAdminProcedure
    .input(
      z.object({
        templateId: z.string(),
        siteContent: z.object({
          heroTitle: z.string().optional(),
          heroSubtitle: z.string().optional(),
          aboutText: z.string().optional(),
          primaryColor: z.string().optional(),
          logoUrl: z.string().optional(),
          faviconUrl: z.string().optional(),
          footerText: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, siteContent } = input;

      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updatedBusiness = await ctx.db.business.update({
        where: { id: business.id },
        data: {
          templateId,
          siteContent: {
            upsert: {
              create: siteContent,
              update: siteContent,
            },
          },
        },
        include: {
          siteContent: true,
        },
      });
      return updatedBusiness;
    }),

  updateGeneral: ownerAdminProcedure
    .input(
      z.object({
        name: z.string(),
        ownerEmail: z.string(),
        supportEmail: z.string().optional(),
        businessAddress: z.string().optional(),
        taxId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, ownerEmail, supportEmail, businessAddress, taxId } = input;

      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updatedBusiness = await ctx.db.business.update({
        where: { id: business.id },
        data: { name, ownerEmail, supportEmail, businessAddress, taxId },
      });
      return updatedBusiness;
    }),

  updateIntegrations: ownerAdminProcedure
    .input(
      z.object({
        umamiWebsiteId: z.string().optional(),
        umamiEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { umamiWebsiteId, umamiEnabled } = input;

      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updatedBusiness = await ctx.db.business.update({
        where: { id: business.id },
        data: { umamiWebsiteId, umamiEnabled },
      });
      return updatedBusiness;
    }),

  updateSeo: ownerAdminProcedure
    .input(
      z.object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        ogImage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { metaTitle, metaDescription, metaKeywords, ogImage } = input;

      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updatedBusiness = await ctx.db.business.update({
        where: { id: business.id },
        data: {
          siteContent: {
            upsert: {
              create: {
                metaTitle,
                metaDescription,
                metaKeywords,
                ogImage,
              },
              update: {
                metaTitle,
                metaDescription,
                metaKeywords,
                ogImage,
              },
            },
          },
        },
        include: {
          siteContent: true,
        },
      });
      return updatedBusiness;
    }),
});
