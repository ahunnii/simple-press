import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { TEMPLATES } from "~/lib/constants";
import { emailOverridesSchema } from "~/lib/email/customization";
import {
  getPlatformMaintenance,
  resolveStorefrontMaintenance,
} from "~/lib/maintenance";
import { getAuthorizedPreviewBusinessId } from "~/lib/preview/preview-context";
import { dollarsToCents } from "~/lib/prices";
import { stripeClient } from "~/lib/stripe/client";
import { isTemplateAvailableForSubdomain } from "~/lib/template-ownership";
import { businessHoursSchema } from "~/lib/validators/business-hours";
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
        businessHours: true,
        timeZone: true,
        supportEmail: true,
        phoneNumber: true,
        customDomain: true,
        domainStatus: true,
        subdomain: true,
        localBusinessEnabled: true,
        shippingType: true,
        shippingFlatRate: true,
        freeShippingThreshold: true,
        offersInStorePickup: true,
        pickupLocation: true,
        pickupInstructions: true,
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
            bannerConfig: true,
            popupConfig: true,
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
        businessHours: true,
        timeZone: true,
        stripeAccountId: true,
        supportEmail: true,
        phoneNumber: true,
        subdomain: true,
        customDomain: true,
        domainStatus: true,
        localBusinessEnabled: true,
        shippingType: true,
        shippingFlatRate: true,
        freeShippingThreshold: true,
        offersInStorePickup: true,
        pickupLocation: true,
        pickupInstructions: true,
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
            bannerConfig: true,
            popupConfig: true,
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
        phoneNumber: true,
        supportEmail: true,
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

  // Owner-customized transactional email copy (subject + intro text).
  getEmailOverrides: ownerAdminProcedure.query(async ({ ctx }) => {
    const siteContent = await ctx.db.siteContent.findUnique({
      where: { businessId: ctx.businessId },
      select: { emailOverrides: true },
    });

    const parsed = emailOverridesSchema.safeParse(
      siteContent?.emailOverrides ?? {},
    );
    return parsed.success ? parsed.data : {};
  }),

  updateEmailOverrides: ownerAdminProcedure
    .input(emailOverridesSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Drop empty values and empty entries so cleared fields fall back to
      // the default copy instead of persisting empty strings.
      const cleaned: Record<string, { subject?: string; introText?: string }> =
        {};
      for (const [templateId, value] of Object.entries(input)) {
        const entry: { subject?: string; introText?: string } = {};
        if (value?.subject?.trim()) entry.subject = value.subject.trim();
        if (value?.introText?.trim()) entry.introText = value.introText.trim();
        if (Object.keys(entry).length > 0) cleaned[templateId] = entry;
      }

      await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          emailOverrides: cleaned as Prisma.InputJsonValue,
        },
        update: {
          emailOverrides: cleaned as Prisma.InputJsonValue,
        },
      });

      return { overrides: cleaned };
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

    const [business, publishedProductCount] = await Promise.all([
      ctx.db.business.findFirst({
        where: {
          id: businessId.id,
          status: "active",
        },
        include: {
          siteContent: true,
          images: true,
          products: {
            where: { published: true },
            // Explicit select keeps the shop-page payload lean: only fields
            // consumed by product cards, shop filter clients, and
            // use-shop-filters. Heavy unused columns (excerpt, SEO meta,
            // cost/barcode, alert flags, variant options JSON, etc.) are
            // intentionally omitted.
            select: {
              id: true,
              createdAt: true, // "newest" sort in use-shop-filters
              name: true,
              slug: true,
              description: true, // card teaser text + client-side search
              sku: true, // noise product card
              price: true,
              compareAtPrice: true,
              trackInventory: true,
              inventoryQty: true,
              allowBackorders: true,
              baseUnitsConsumed: true,
              additionalFields: true, // comingSoon / productTagline etc.
              images: {
                select: { id: true, url: true, altText: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
              variants: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  compareAtPrice: true,
                  inventoryQty: true,
                },
              },
              collectionProducts: {
                select: {
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
            // Payload ceiling: the shop page serializes every product to the
            // browser for client-side filtering. Cap at the 500 newest
            // published products so a huge catalog can't blow up the response.
            // Stores beyond 500 products need real server-side pagination.
            take: 500,
          },
        },
      }),
      ctx.db.product.count({
        where: { businessId: businessId.id, published: true },
      }),
    ]);

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

    // Total published products (the products array above is capped at 500),
    // so consumers can detect truncation without another query.
    return {
      ...business,
      siteContent: sanitizedSiteContent,
      publishedProductCount,
    };
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

    // Annual order stats — current calendar year. INFORM Act thresholds
    // measure transactions conducted, not revenue currently retained: an
    // order that was paid counts even if it was later refunded or disputed,
    // while an order that was never paid (pending/unpaid/failed) does not.
    // This is gross, not net of refunds — deliberately different from the
    // dashboard's revenue convention (paid-only, net of refunds).
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const orderStats = await ctx.db.order.aggregate({
      where: {
        businessId,
        createdAt: { gte: startOfYear },
        paymentStatus: { in: ["paid", "refunded", "disputed"] },
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
          ? { pages: { where: { type: "page" }, orderBy: { sortOrder: "asc" } } }
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
        ownerEmail: z.string().email(),
        supportEmail: z.string().email().optional(),
        businessAddress: z.string().optional(),
        phoneNumber: z.string().optional(),
        sendAbandonedCheckoutEmails: z.boolean().optional(),
        timeZone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        name,
        ownerEmail,
        supportEmail,
        businessAddress,
        phoneNumber,
        sendAbandonedCheckoutEmails,
        timeZone,
      } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          name,
          ownerEmail,
          supportEmail,
          businessAddress,
          phoneNumber,
          sendAbandonedCheckoutEmails,
          timeZone,
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
        pickupLocation: z.string().optional(),
        pickupInstructions: z.string().optional(),
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
        pickupLocation,
        pickupInstructions,
      } = input;

      const trimmedPickupLocation = pickupLocation?.trim();
      const trimmedPickupInstructions = pickupInstructions?.trim();

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
          pickupLocation:
            offersInStorePickup && trimmedPickupLocation
              ? trimmedPickupLocation
              : null,
          pickupInstructions:
            offersInStorePickup && trimmedPickupInstructions
              ? trimmedPickupInstructions
              : null,
        },
      });
      return {
        message: "Shipping settings updated successfully",
        business: updatedBusiness,
      };
    }),

  updateBusinessHours: ownerAdminProcedure
    .input(z.object({ businessHours: businessHoursSchema }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.business.update({
        where: { id: businessId },
        data: { businessHours: input.businessHours as Prisma.InputJsonValue },
      });
    }),

  updateSeo: ownerAdminProcedure
    .input(
      z.object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        ogImage: z.string().optional(),
        localBusinessEnabled: z.boolean().optional(),
        allowAiCrawlers: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const {
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
        localBusinessEnabled,
        allowAiCrawlers,
      } = input;

      const updatedBusiness = await ctx.db.business.update({
        where: { id: businessId },
        data: {
          ...(localBusinessEnabled !== undefined && { localBusinessEnabled }),
          ...(allowAiCrawlers !== undefined && { allowAiCrawlers }),
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
        pickupLocation,
        pickupInstructions,
      } = input;

      // Convert dollar strings → cents.
      const fallbackRateCents = dollarsToCents(fallbackRateDollars);
      const thresholdRaw = freeShippingThresholdDollars?.trim() ?? "";
      const freeShippingThresholdCents =
        thresholdRaw !== "" ? dollarsToCents(thresholdRaw) : null;
      const trimmedPickupLocation = pickupLocation?.trim();
      const trimmedPickupInstructions = pickupInstructions?.trim();

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
            pickupLocation:
              offersInStorePickup && trimmedPickupLocation
                ? trimmedPickupLocation
                : null,
            pickupInstructions:
              offersInStorePickup && trimmedPickupInstructions
                ? trimmedPickupInstructions
                : null,
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

  updateTemplate: ownerAdminProcedure
    .input(
      z.object({
        templateId: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { subdomain: true, templateId: true },
      });
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Commercial templates are locked to their owning subdomain. Allow only
      // templates available to this business (free templates + ones it owns),
      // plus its currently-active template so an existing assignment is never
      // lost. Never trust the client — re-validate ownership server-side.
      const allowed =
        input.templateId === business.templateId ||
        isTemplateAvailableForSubdomain(input.templateId, business.subdomain);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This template is not available for your store.",
        });
      }

      await ctx.db.business.update({
        where: { id: businessId },
        data: { templateId: input.templateId },
      });
      return { success: true };
    }),
});
