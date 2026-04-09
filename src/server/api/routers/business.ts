import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { stripeClient } from "~/lib/stripe/client";
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
        phoneNumber: true,
        customDomain: true,
        domainStatus: true,
        subdomain: true,
        shippingType: true,
        shippingFlatRate: true,
        freeShippingThreshold: true,
        offersInStorePickup: true,
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
        phoneNumber: true,
        shippingType: true,
        shippingFlatRate: true,
        freeShippingThreshold: true,
        offersInStorePickup: true,
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
        businessAddress: true,
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
            compareAtPrice: true,
            description: true,
            variants: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
            additionalFields: true,
            trackInventory: true,
            inventoryQty: true,
            allowBackorders: true,
          },
          take: 4,
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
            collectionProducts: {
              include: {
                collection: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
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
        stripeAutoTaxEnabled: true,
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

  getPaymentsOverview: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const business = await ctx.db.business.findFirst({
      where: { id: businessId },
      select: { stripeAccountId: true },
    });

    // Annual order stats — current calendar year, exclude refunded/cancelled
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const orderStats = await ctx.db.order.aggregate({
      where: {
        businessId,
        createdAt: { gte: startOfYear },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _count: { id: true },
      _sum: { total: true },
    });

    const annualTransactions = orderStats._count.id;
    const annualRevenueCents = orderStats._sum.total ?? 0;
    // INFORM Act: 200+ transactions OR $5,000+ (500000 cents) annual revenue
    const informActThresholdReached =
      annualTransactions >= 200 || annualRevenueCents >= 500000;

    let stripeDetailsSubmitted = false;
    let stripeBalance: {
      available: { amount: number; currency: string }[];
      pending: { amount: number; currency: string }[];
    } | null = null;
    let recentPayouts:
      | {
          id: string;
          amount: number;
          currency: string;
          status: string;
          arrival_date: number;
        }[]
      | null = null;

    const accountId = business?.stripeAccountId;
    if (accountId) {
      try {
        const [balance, payouts, account] = await Promise.all([
          stripeClient.balance.retrieve({ stripeAccount: accountId }),
          stripeClient.payouts.list({ limit: 5 }, { stripeAccount: accountId }),
          stripeClient.accounts.retrieve(accountId),
        ]);

        stripeDetailsSubmitted = account.details_submitted ?? false;
        stripeBalance = {
          available: balance.available.map((b) => ({
            amount: b.amount,
            currency: b.currency,
          })),
          pending: balance.pending.map((b) => ({
            amount: b.amount,
            currency: b.currency,
          })),
        };
        recentPayouts = payouts.data.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          arrival_date: p.arrival_date,
        }));
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            "trpc.procedure": "business.getPaymentsOverview",
            service: "stripe",
          },
        });
        // Non-fatal — return partial data
      }
    }

    return {
      annualTransactions,
      annualRevenueCents,
      informActThresholdReached,
      stripeDetailsSubmitted,
      stripeBalance,
      recentPayouts,
      isStripeConnected: !!accountId,
    };
  }),

  updateStripeSettings: ownerAdminProcedure
    .input(z.object({ stripeAutoTaxEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // When enabling, verify Stripe Tax is actually configured on the connected
      // account before saving. If not active, block and explain what's needed.
      if (input.stripeAutoTaxEnabled) {
        const business = await ctx.db.business.findFirst({
          where: { id: businessId },
          select: { stripeAccountId: true },
        });

        if (!business?.stripeAccountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Connect a Stripe account before enabling automatic tax collection.",
          });
        }

        try {
          const taxSettings = await stripeClient.tax.settings.retrieve({
            stripeAccount: business.stripeAccountId,
          });

          if (taxSettings.status !== "active") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Stripe Tax is not fully configured on your account. Add your business address and at least one active tax registration in the Stripe Tax Dashboard, then try again.",
            });
          }
        } catch (err) {
          // Re-throw TRPCErrors as-is; wrap Stripe API errors
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Could not verify your Stripe Tax setup. Make sure Stripe Tax is configured in your Stripe Dashboard before enabling this.",
          });
        }
      }

      await ctx.db.business.update({
        where: { id: businessId },
        data: { stripeAutoTaxEnabled: input.stripeAutoTaxEnabled },
      });

      return { success: true };
    }),

  getWith: ownerAdminProcedure
    .input(
      z.object({
        includePages: z.boolean().optional(),
        includeSiteContent: z.boolean().optional(),
        includeBlog: z.boolean().optional(),
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
        ...(input?.includeBlog
          ? {
              pages: { where: { type: "blog" }, orderBy: { sortOrder: "asc" } },
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
        phoneNumber: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        name,
        ownerEmail,
        supportEmail,
        businessAddress,
        taxId,
        phoneNumber,
      } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          name,
          ownerEmail,
          supportEmail,
          businessAddress,
          taxId,
          phoneNumber,
        },
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

  updateShipping: ownerAdminProcedure
    .input(
      z.object({
        shippingType: z.enum(["free", "flat_rate", "flat_rate_with_threshold"]),
        shippingFlatRate: z.number().int().min(0).nullable().optional(),
        freeShippingThreshold: z.number().int().min(0).nullable().optional(),
        offersInStorePickup: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        shippingType,
        shippingFlatRate,
        freeShippingThreshold,
        offersInStorePickup,
      } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          shippingType,
          shippingFlatRate:
            shippingType === "free" ? null : (shippingFlatRate ?? null),
          freeShippingThreshold:
            shippingType === "flat_rate_with_threshold"
              ? (freeShippingThreshold ?? null)
              : null,
          offersInStorePickup,
        },
      });
      return {
        message: "Shipping settings updated successfully",
        business: updatedBusiness,
      };
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
