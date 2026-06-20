import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  getPlatformMaintenance,
  resolveStorefrontMaintenance,
} from "~/lib/maintenance";
import { dollarsToCents } from "~/lib/prices";
import { getAuthorizedPreviewBusinessId } from "~/lib/preview/preview-context";
import { stripeClient } from "~/lib/stripe/client";
import { zoneWeightFormSchema } from "~/lib/validators/shipping";
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
        originState: true,
        shippingWeightTiers: true,
        shippingFallbackRate: true,
        shippingDefaultItemWeightLb: true,
        salesCountries: true,
        zones: {
          include: { rates: true },
          orderBy: { sortOrder: "asc" as const },
        },
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
            previewCustomFields: true,
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

    // Swap in the preview draft if the current user is an authorized owner/manager.
    const sc = businessData.siteContent;
    if (sc?.previewCustomFields != null) {
      const previewBizId = await getAuthorizedPreviewBusinessId(
        businessData.id,
      );
      if (previewBizId) {
        sc.customFields = sc.previewCustomFields;
      }
    }

    const { stripeAccountId, ...rest } = businessData;
    const sanitizedSiteContent = rest.siteContent
      ? (({ previewCustomFields: _drop, ...safe }) => safe)(rest.siteContent)
      : rest.siteContent;
    return {
      ...rest,
      siteContent: sanitizedSiteContent,
      isStripeConnected: !!stripeAccountId,
    };
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
        featureFlags: true,
        businessAddress: true,
        stripeAccountId: true,
        supportEmail: true,
        phoneNumber: true,
        subdomain: true,
        customDomain: true,
        domainStatus: true,
        shippingType: true,
        shippingFlatRate: true,
        freeShippingThreshold: true,
        offersInStorePickup: true,
        originState: true,
        shippingWeightTiers: true,
        shippingFallbackRate: true,
        shippingDefaultItemWeightLb: true,
        zones: {
          include: { rates: true },
          orderBy: { sortOrder: "asc" as const },
        },
        maintenanceMode: true,
        maintenanceVariant: true,
        maintenanceMessage: true,
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
            previewCustomFields: true,
          },
        },
      },
    });

    if (!businessData) {
      return null;
    }

    // Swap in the preview draft if the current user is an authorized owner/manager.
    const sc = businessData.siteContent;
    if (sc?.previewCustomFields != null) {
      const previewBizId = await getAuthorizedPreviewBusinessId(
        businessData.id,
      );
      if (previewBizId) {
        sc.customFields = sc.previewCustomFields;
      }
    }
    // Never ship the raw draft field to clients.
    const {
      stripeAccountId,
      maintenanceMode,
      maintenanceVariant,
      maintenanceMessage,
      ...rest
    } = businessData;
    const { siteContent, ...restWithoutSiteContent } = rest;
    const sanitizedSiteContent = siteContent
      ? (({ previewCustomFields: _drop, ...safe }) => safe)(siteContent)
      : siteContent;

    const platform = await getPlatformMaintenance();
    const maintenance = resolveStorefrontMaintenance({
      platform,
      business: {
        maintenanceMode,
        maintenanceVariant,
        maintenanceMessage: maintenanceMessage ?? null,
      },
    });

    return {
      ...restWithoutSiteContent,
      siteContent: sanitizedSiteContent,
      isStripeConnected: !!stripeAccountId,
      maintenance,
    };
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
            previewCustomFields: true,
            socialLinks: true,
          },
        },
        products: {
          where: {
            published: true,
            OR: [
              {
                additionalFields: {
                  path: ["comingSoon"],
                  equals: "false",
                },
              },
              {
                additionalFields: {
                  path: ["comingSoon"],
                  equals: false,
                },
              },
            ],
          },
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
            baseUnitsConsumed: true,
            baseInventoryUnit: {
              select: { inventoryQty: true, allowBackorders: true },
            },
          },
          take: 4,
        },
      },
    });

    if (!homepage) return homepage;

    // Swap in the preview draft if the current user is an authorized owner/manager.
    const hsc = homepage.siteContent;
    if (hsc?.previewCustomFields != null) {
      const previewBizId = await getAuthorizedPreviewBusinessId(business.id);
      if (previewBizId) {
        hsc.customFields = hsc.previewCustomFields;
      }
    }
    // Never ship the raw draft field to clients.
    const { siteContent: homepageSc, ...homepageRest } = homepage;
    const sanitizedHomepageSc = homepageSc
      ? (({ previewCustomFields: _drop, ...safe }) => safe)(homepageSc)
      : homepageSc;
    return { ...homepageRest, siteContent: sanitizedHomepageSc };
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
            baseInventoryUnit: {
              select: { inventoryQty: true, allowBackorders: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (business && business.products && Array.isArray(business.products)) {
      // Move products with additionalFields.comingSoon === true to the bottom
      business.products = [
        ...business.products.filter(
          (p) =>
            !(
              p.additionalFields &&
              (p.additionalFields as Record<string, unknown>).comingSoon ===
                true
            ),
        ),
        ...business.products.filter(
          (p) =>
            p.additionalFields &&
            (p.additionalFields as Record<string, unknown>).comingSoon === true,
        ),
      ];
    }

    if (!business) {
      return business;
    }

    // Swap in the preview draft if the current user is an authorized owner/manager.
    const sc = business.siteContent;
    if (sc?.previewCustomFields != null) {
      const previewBizId = await getAuthorizedPreviewBusinessId(business.id);
      if (previewBizId) {
        sc.customFields = sc.previewCustomFields;
      }
    }
    // Never ship the raw draft field to clients.
    const sanitizedSiteContent = sc
      ? (({ previewCustomFields: _drop, ...safe }) => safe)(sc)
      : sc;

    return { ...business, siteContent: sanitizedSiteContent };
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

  updateTestimonialSettings: ownerAdminProcedure
    .input(z.object({ testimonialsAutoApprove: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      await ctx.db.business.update({
        where: { id: businessId },
        data: { testimonialsAutoApprove: input.testimonialsAutoApprove },
      });
      return { success: true };
    }),

  updateMaintenanceMode: ownerAdminProcedure
    .input(
      z.object({
        maintenanceMode: z.boolean(),
        maintenanceVariant: z.enum(["maintenance", "coming_soon"]),
        maintenanceMessage: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.business.update({
        where: { id: ctx.businessId },
        data: {
          maintenanceMode: input.maintenanceMode,
          maintenanceVariant: input.maintenanceVariant,
          maintenanceMessage: input.maintenanceMessage ?? null,
        },
      });
      return { success: true };
    }),

  getMaintenanceSettings: ownerAdminProcedure.query(async ({ ctx }) => {
    const business = await ctx.db.business.findUnique({
      where: { id: ctx.businessId },
      select: {
        maintenanceMode: true,
        maintenanceVariant: true,
        maintenanceMessage: true,
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
        // Always include shipping zones so the shipping-settings editor can
        // hydrate a saved zone_weight config. Small relation; cheap to fetch.
        zones: {
          include: { rates: true },
          orderBy: { sortOrder: "asc" },
        },
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
        phoneNumber: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { name, ownerEmail, supportEmail, businessAddress, phoneNumber } =
        input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          name,
          ownerEmail,
          supportEmail,
          businessAddress,
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
        salesCountries: z.array(z.enum(["CA", "MX"])).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        shippingType,
        shippingFlatRate,
        freeShippingThreshold,
        offersInStorePickup,
        salesCountries,
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
          salesCountries,
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

  /**
   * Transactionally save the zone+weight shipping configuration for the business.
   * Replaces all existing ShippingZone / ShippingRate rows for this business.
   * Input uses dollar strings (form ergonomics); this mutation converts to cents.
   */
  saveZoneWeightShipping: ownerAdminProcedure
    .input(zoneWeightFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        originState,
        weightTiers,
        zones,
        fallbackRateDollars,
        freeShippingThresholdDollars,
        defaultItemWeightLb,
        offersInStorePickup,
        salesCountries,
      } = input;

      // Convert dollar strings → cents.
      const fallbackRateCents = dollarsToCents(fallbackRateDollars);
      const thresholdRaw = freeShippingThresholdDollars?.trim() ?? "";
      const freeShippingThresholdCents =
        thresholdRaw !== "" ? dollarsToCents(thresholdRaw) : null;

      await ctx.db.$transaction(async (tx) => {
        // Update Business fields.
        await tx.business.update({
          where: { id: businessId },
          data: {
            shippingType: "zone_weight",
            originState,
            shippingWeightTiers: weightTiers,
            shippingFallbackRate: fallbackRateCents,
            shippingDefaultItemWeightLb: defaultItemWeightLb,
            freeShippingThreshold: freeShippingThresholdCents,
            offersInStorePickup,
            salesCountries,
          },
        });

        // Delete all existing ShippingZone rows (ShippingRate cascades via FK).
        await tx.shippingZone.deleteMany({
          where: { businessId },
        });

        // Re-create zones and their rate cells.
        for (let zoneIdx = 0; zoneIdx < zones.length; zoneIdx++) {
          const zone = zones[zoneIdx];
          if (!zone) continue;

          const createdZone = await tx.shippingZone.create({
            data: {
              businessId,
              name: zone.name,
              states: zone.states,
              sortOrder: zoneIdx,
            },
            select: { id: true },
          });

          // Build ShippingRate rows from the rateDollars Record<string, string>.
          const ratesToCreate = Object.entries(zone.rateDollars).map(
            ([tierKey, dollarStr]) => ({
              zoneId: createdZone.id,
              tierIndex: Number(tierKey),
              priceCents: dollarsToCents(dollarStr),
            }),
          );

          if (ratesToCreate.length > 0) {
            await tx.shippingRate.createMany({
              data: ratesToCreate,
            });
          }
        }
      });

      return { message: "Shipping settings updated successfully" };
    }),
});
