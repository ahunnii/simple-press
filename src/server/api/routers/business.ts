import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { updateBrandingSchema } from "~/lib/validators/branding";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const businessRouter = createTRPCRouter({
  simplifiedGet: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();

    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const businessData = await ctx.db.business.findFirst({
      where: {
        id: business.id,
        status: "active",
      },
      select: {
        name: true,
        templateId: true,
        businessAddress: true,
        supportEmail: true,
        siteContent: {
          select: {
            logoUrl: true,
            logoAltText: true,
            footerText: true,
            navigationItems: true,
            socialLinks: true,
          },
        },
      },
    });
    return businessData;
  }),

  getHomepage: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const homepage = await ctx.db.business.findFirst({
      where: {
        id: business.id,
        status: "active",
      },
      select: {
        name: true,
        templateId: true,
        siteContent: {
          select: {
            heroTitle: true,
            heroSubtitle: true,
            heroImageUrl: true,
            heroButtonText: true,
            heroButtonLink: true,
            aboutTitle: true,
            aboutText: true,
            aboutImageUrl: true,
            features: true,
            customFields: true,
          },
        },
        products: {
          where: { published: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            description: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
    return homepage;
  }),

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
          images: true,

          ...(input?.includeProducts
            ? {
                products: {
                  where: { published: true },
                  include: {
                    images: {
                      orderBy: { sortOrder: "asc" },
                      take: 1,
                    },
                    variants: true,
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

  getWithProducts: publicProcedure.query(async ({ ctx }) => {
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
        images: true,

        products: {
          where: { published: true },
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
            variants: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return business;
  }),

  secureGetContent: ownerAdminProcedure.query(async ({ ctx }) => {
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
        pages: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return business;
  }),

  updateBranding: ownerAdminProcedure
    .input(updateBrandingSchema)
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
        include: { siteContent: true },
      });

      return {
        message: "Branding updated successfully",
        businessId: updatedBusiness.id,
      };
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
      return {
        message: "General settings updated successfully",
        businessId: updatedBusiness.id,
      };
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
