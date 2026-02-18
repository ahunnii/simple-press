import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const businessRouter = createTRPCRouter({
  simplifiedGet: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();

    if (!business) return null;

    const businessData = await ctx.db.business.findFirst({
      where: {
        id: business.id,
        status: "active",
      },
      select: {
        id: true,
        stripeAccountId: true,
        name: true,
        templateId: true,
        businessAddress: true,
        supportEmail: true,
        customDomain: true,
        domainStatus: true,
        siteContent: {
          select: {
            logoUrl: true,
            faviconUrl: true,
            logoAltText: true,
            footerText: true,
            primaryColor: true,
            navigationItems: true,
            socialLinks: true,
            customFields: true,
            metaTitle: true,
            metaDescription: true,
            metaKeywords: true,
            ogImage: true,
          },
        },
      },
    });

    if (!businessData) {
      return null;
    }

    const { stripeAccountId, ...rest } = businessData;

    return { ...rest, isStripeConnected: !!stripeAccountId };
  }),

  simplifiedGetWithProducts: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();

    if (!business) {
      return null;
    }

    const businessData = await ctx.db.business.findFirst({
      where: {
        id: business.id,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        templateId: true,
        businessAddress: true,
        stripeAccountId: true,
        supportEmail: true,
        products: {
          where: { published: true },
          include: {
            images: true,
          },
        },
        siteContent: {
          select: {
            logoUrl: true,
            logoAltText: true,
            primaryColor: true,
            footerText: true,
            navigationItems: true,
            socialLinks: true,
            customFields: true,
          },
        },
      },
    });

    if (!businessData) {
      return null;
    }
    const { stripeAccountId, ...rest } = businessData;
    return { ...rest, isStripeConnected: !!stripeAccountId };
  }),

  getWithPolicies: ownerAdminProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const policies = await ctx.db.business.findFirst({
      where: { id: business.id },
      include: { pages: { where: { type: "policy" } } },
    });
    return policies;
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
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            logoUrl: true,
            logoAltText: true,
            faviconUrl: true,
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

  getForEmailPreview: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const business = await ctx.db.business.findFirst({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        siteContent: {
          select: {
            logoUrl: true,
          },
        },
      },
    });
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const sampleOrder = await ctx.db.order.findFirst({
      where: { businessId },
      include: {
        items: true,
        shippingAddress: true,
      },
    });
    return { business, sampleOrder };
  }),

  get: ownerAdminProcedure
    .input(
      z
        .object({
          productNumber: z.number().optional(),
          includeProducts: z.boolean().optional(),
          includePages: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const businessId = await checkBusiness();

      if (!businessId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const business = await ctx.db.business.findFirst({
        where: {
          id: businessId.id,
          status: "active",
        },
        include: {
          siteContent: true,
          images: true,
          ...(input?.includePages ? { pages: true } : {}),
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
    const businessId = await checkBusiness();
    if (!businessId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const business = await ctx.db.business.findFirst({
      where: {
        id: businessId.id,
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

  getWithIntegrations: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const business = await ctx.db.business.findFirst({
      where: { id: businessId },
      select: {
        id: true,
        stripeAccountId: true,
        umamiWebsiteId: true,
        umamiEnabled: true,
      },
    });
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    return business;
  }),

  getWith: ownerAdminProcedure
    .input(
      z.object({
        includePages: z.boolean().optional(),
        includeSiteContent: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const include = {
        ...(input?.includePages
          ? { pages: { orderBy: { sortOrder: "asc" } } }
          : {}),
        ...(input?.includeSiteContent
          ? {
              siteContent: true,
            }
          : {}),
      };

      const business = await ctx.db.business.findFirst({
        where: { id: businessId },
        include: include as Prisma.BusinessInclude,
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      return business;
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
      const { businessId } = ctx;
      const { name, ownerEmail, supportEmail, businessAddress, taxId } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: { name, ownerEmail, supportEmail, businessAddress, taxId },
      });
      return {
        message: "General settings updated successfully",
        businessId: updatedBusiness.id,
        business: updatedBusiness,
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
      const { businessId } = ctx;
      const { umamiWebsiteId, umamiEnabled } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
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
      const { businessId } = ctx;
      const { metaTitle, metaDescription, metaKeywords, ogImage } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
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
        include: { siteContent: true },
      });
      return updatedBusiness;
    }),
});
