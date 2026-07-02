import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { notifyDiscordDeletionRequest } from "~/lib/discord/notification";
import { normalizeEmail } from "~/lib/utils";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({
  // Get customer profile for current user
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    // Get the current business from the domain
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    // Find customer linked to this user
    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
      include: {
        shippingAddresses: {
          orderBy: { isDefault: "desc" },
        },
      },
    });

    return customer;
  }),

  // Get a single order for the current user (by orderId, scoped to their customer record)
  getMyOrderById: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const user = ctx.session.user;

      const customer = await ctx.db.customer.findFirst({
        where: {
          userId: user.id,
          businessId: business.id,
        },
      });

      if (!customer) {
        return null;
      }

      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          customerId: customer.id,
        },
        include: {
          items: true,
          shippingAddress: true,
          shipments: true,
        },
      });

      return order ?? null;
    }),

  // Get order history for current user
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const user = ctx.session.user;

    // Link any unlinked customer records for this email (self-heal for orders
    // placed before the userId was set correctly on the Customer record)
    await ctx.db.customer.updateMany({
      where: {
        email: normalizeEmail(user.email),
        businessId: business.id,
        userId: null,
      },
      data: { userId: user.id },
    });

    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
    });

    if (!customer) {
      return [];
    }

    // Get all orders for this customer
    const orders = await ctx.db.order.findMany({
      where: {
        customerId: customer.id,
      },
      include: {
        items: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders;
  }),

  updateMarketingPreference: protectedProcedure
    .input(z.object({ acceptsMarketing: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }
      const customer = await ctx.db.customer.findFirst({
        where: { userId: user.id, businessId: business.id },
      });
      if (!customer) return null;
      return ctx.db.customer.update({
        where: { id: customer.id },
        data: { acceptsMarketing: input.acceptsMarketing },
      });
    }),

  addAddress: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        company: z.string().optional(),
        address1: z.string().min(1),
        address2: z.string().optional(),
        city: z.string().min(1),
        province: z.string().optional(),
        country: z.string().min(1),
        zip: z.string().min(1),
        phone: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Upsert customer if they haven't ordered before
      const normalizedUserEmail = normalizeEmail(user.email);
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            businessId: business.id,
            email: normalizedUserEmail,
          },
        },
        create: {
          email: normalizedUserEmail,
          firstName: user.name?.split(" ")[0] ?? "",
          lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
          userId: user.id,
          businessId: business.id,
        },
        update: {},
      });

      if (input.isDefault) {
        await ctx.db.shippingAddress.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      return ctx.db.shippingAddress.create({
        data: {
          customerId: customer.id,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          address1: input.address1,
          address2: input.address2,
          city: input.city,
          province: input.province,
          country: input.country,
          zip: input.zip,
          phone: input.phone,
          isDefault: input.isDefault ?? false,
        },
      });
    }),

  updateAddress: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        company: z.string().optional(),
        address1: z.string().min(1).optional(),
        address2: z.string().optional(),
        city: z.string().min(1).optional(),
        province: z.string().optional(),
        country: z.string().min(1).optional(),
        zip: z.string().min(1).optional(),
        phone: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (
        !address ||
        address.customer.userId !== user.id ||
        address.customer.businessId !== business.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Address not found",
        });
      }

      if (input.isDefault) {
        await ctx.db.shippingAddress.updateMany({
          where: { customerId: address.customerId },
          data: { isDefault: false },
        });
      }

      const { id, ...data } = input;
      return ctx.db.shippingAddress.update({
        where: { id },
        data,
      });
    }),

  deleteAddress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (
        !address ||
        address.customer.userId !== user.id ||
        address.customer.businessId !== business.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Address not found",
        });
      }

      await ctx.db.shippingAddress.delete({ where: { id: input.id } });
      return { success: true };
    }),

  setDefaultAddress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (
        !address ||
        address.customer.userId !== user.id ||
        address.customer.businessId !== business.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Address not found",
        });
      }

      await ctx.db.$transaction([
        ctx.db.shippingAddress.updateMany({
          where: { customerId: address.customerId },
          data: { isDefault: false },
        }),
        ctx.db.shippingAddress.update({
          where: { id: input.id },
          data: { isDefault: true },
        }),
      ]);

      return { success: true };
    }),

  // Export all personal data for the current user (GDPR/CCPA data portability)
  exportMyData: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
      include: {
        shippingAddresses: true,
        orders: {
          include: {
            items: true,
            shippingAddress: true,
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: true,
        testimonials: true,
      },
    });

    if (!customer) return null;

    return {
      exportedAt: new Date().toISOString(),
      business: { id: business.id, name: business.name },
      profile: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        acceptsMarketing: customer.acceptsMarketing,
        createdAt: customer.createdAt,
      },
      addresses: customer.shippingAddresses.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        company: a.company,
        address1: a.address1,
        address2: a.address2,
        city: a.city,
        province: a.province,
        country: a.country,
        zip: a.zip,
        phone: a.phone,
        isDefault: a.isDefault,
        createdAt: a.createdAt,
      })),
      orders: customer.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        subtotal: o.subtotal,
        tax: o.tax,
        shipping: o.shipping,
        discount: o.discount,
        total: o.total,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          sku: i.sku,
          price: i.price,
          quantity: i.quantity,
          total: i.total,
        })),
        shippingAddress: o.shippingAddress
          ? {
              firstName: o.shippingAddress.firstName,
              lastName: o.shippingAddress.lastName,
              address1: o.shippingAddress.address1,
              address2: o.shippingAddress.address2,
              city: o.shippingAddress.city,
              province: o.shippingAddress.province,
              country: o.shippingAddress.country,
              zip: o.shippingAddress.zip,
            }
          : null,
      })),
      reviews: customer.reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        reviewDate: r.reviewDate,
        isApproved: r.isApproved,
        createdAt: r.createdAt,
      })),
      testimonials: customer.testimonials.map((t) => ({
        id: t.id,
        text: t.text,
        title: t.title,
        isApproved: t.isApproved,
        testimonialDate: t.testimonialDate,
        createdAt: t.createdAt,
      })),
    };
  }),

  // Request deletion of personal data (GDPR right to erasure / CCPA right to delete)
  requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.session.user;

    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
    });

    if (!customer) {
      return { success: true, hadData: false };
    }

    if (customer.anonymizedAt) {
      return { success: true, alreadyAnonymized: true };
    }

    if (customer.deletionRequestedAt) {
      return { success: true, alreadyRequested: true };
    }

    await ctx.db.customer.update({
      where: { id: customer.id },
      data: { deletionRequestedAt: new Date() },
    });

    // Best-effort Discord notification — failure must not fail the mutation
    void notifyDiscordDeletionRequest({
      customerId: customer.id,
      businessName: business.name,
    }).catch((err: unknown) => {
      Sentry.captureException(err, {
        tags: { "discord.notification": "deletion-request" },
        extra: { customerId: customer.id, businessId: business.id },
      });
    });

    return { success: true, requested: true };
  }),

  // Anonymize a customer's personal data (owner/admin action)
  anonymize: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const customer = await ctx.db.customer.findFirst({
        where: { id: input.id, businessId },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      if (customer.anonymizedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer already anonymized",
        });
      }

      const placeholder = `anonymized-${input.id}@anonymized.invalid`;

      await ctx.db.$transaction(async (tx) => {
        await tx.shippingAddress.updateMany({
          where: { customerId: input.id },
          data: {
            firstName: "Anonymized",
            lastName: "Anonymized",
            company: null,
            address1: "—",
            address2: null,
            city: "—",
            province: null,
            zip: "—",
            phone: null,
          },
        });

        await tx.order.updateMany({
          where: { customerId: input.id },
          data: {
            customerEmail: placeholder,
            customerName: null,
            customerFirstName: null,
            customerLastName: null,
            customerPhone: null,
          },
        });

        await tx.testimonial.updateMany({
          where: { customerId: input.id },
          data: {
            customerName: "Anonymous",
            customerEmail: null,
            customerTitle: null,
            customerCompany: null,
          },
        });

        await tx.productReview.updateMany({
          where: { customerId: input.id },
          data: {
            customerName: "Anonymous",
            customerEmail: null,
            customerTitle: null,
          },
        });

        await tx.testimonialInvite.deleteMany({
          where: { customerId: input.id },
        });

        await tx.customer.update({
          where: { id: input.id },
          data: {
            email: placeholder,
            firstName: null,
            lastName: null,
            phone: null,
            acceptsMarketing: false,
            userId: null,
            anonymizedAt: new Date(),
            deletionRequestedAt: null,
          },
        });
      });

      return { success: true };
    }),

  // Owner-facing CRM notes about a customer (never shown to the customer)
  updateNotes: ownerAdminProcedure
    .input(
      z.object({
        customerId: z.string(),
        notes: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, businessId },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return ctx.db.customer.update({
        where: { id: input.customerId },
        data: { notes: input.notes },
      });
    }),

  getById: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      return ctx.db.customer.findFirst({
        where: { id, businessId },
        include: {
          orders: {
            include: {
              items: true,
              shippingAddress: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  list: ownerAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.coerce.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const search = input.search?.trim();

      const where = {
        businessId,
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      } satisfies Prisma.CustomerWhereInput;

      // Pagination — mirrors product.secureList
      const pageSize = 50;
      const page = input.page ?? 1;
      const skip = (page - 1) * pageSize;

      // Stats are computed over the FULL filtered set (not just the page).
      const [customers, totalCount, marketingCount] = await ctx.db.$transaction(
        [
          ctx.db.customer.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
          }),
          ctx.db.customer.count({ where }),
          ctx.db.customer.count({
            where: { AND: [where, { acceptsMarketing: true }] },
          }),
        ],
      );

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        customers,
        totalCount,
        page,
        pageSize,
        totalPages,
        stats: {
          totalCustomers: totalCount,
          marketingCount,
        },
      };
    }),
});
