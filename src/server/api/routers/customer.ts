import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient } from "~/server/db";
import { checkBusiness } from "~/lib/check-business";
import { splitCustomerName } from "~/lib/customer-name";
import { notifyDiscordDeletionRequest } from "~/lib/discord/notification";
import { normalizeEmail } from "~/lib/utils";
import { MAX_REQUESTED_PAGE } from "~/lib/validators/admin-table";
import {
  CUSTOMER_MARKETING_DEFAULT,
  CUSTOMER_MARKETING_VALUES,
  CUSTOMER_PRIVACY_DEFAULT,
  CUSTOMER_PRIVACY_VALUES,
  CUSTOMER_SORT_DEFAULT,
  CUSTOMER_SORT_VALUES,
} from "~/lib/validators/customer";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
  staffProcedure,
} from "~/server/api/trpc";

/**
 * Owner-private CRM `notes` must never reach a STAFF (fulfillment-only) caller.
 * `staffProcedure` admits OWNER/MANAGER/STAFF, so we re-resolve the caller's
 * membership role for the resolved business (PLATFORM_ADMIN always allowed).
 */
async function canViewCustomerNotes(
  db: DbClient,
  userId: string,
  platformRole: string | null | undefined,
  businessId: string,
): Promise<boolean> {
  if (platformRole === "PLATFORM_ADMIN") return true;
  const membership = await db.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  return !!membership && ["OWNER", "MANAGER"].includes(membership.role);
}

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
          // Stores NULL, not "", for a missing half — see splitCustomerName.
          ...splitCustomerName(user.name),
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

  getById: staffProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const customer = await ctx.db.customer.findFirst({
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

      if (!customer) return null;

      // STAFF is fulfillment-only and must not see owner-private CRM notes.
      const showNotes = await canViewCustomerNotes(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.platformRole,
        businessId,
      );

      return showNotes ? customer : { ...customer, notes: null };
    }),

  list: staffProcedure
    .input(
      z.object({
        // Truncated, not rejected: the value comes from `?search=` in the URL,
        // so a `.max()` would throw BAD_REQUEST and error-boundary the page
        // instead of showing results. 200 chars is far past any real query, and
        // this feeds three ILIKE `contains` clauses.
        search: z
          .string()
          .transform((s) => s.slice(0, 200))
          .optional(),
        page: z.coerce.number().int().positive().optional(),
        // Every filter/sort field is defaulted, so existing callers that pass
        // `{}` (e.g. the testimonial invite dialog) keep the previous behaviour:
        // unfiltered, newest-first, page 1.
        //
        // The accepted values and their defaults are shared with the admin page
        // that renders the matching controls — see ~/lib/validators/customer for
        // the two ways these drift apart and what each failure looks like.
        marketing: z
          .enum(CUSTOMER_MARKETING_VALUES)
          .default(CUSTOMER_MARKETING_DEFAULT),
        privacy: z
          .enum(CUSTOMER_PRIVACY_VALUES)
          .default(CUSTOMER_PRIVACY_DEFAULT),
        sort: z.enum(CUSTOMER_SORT_VALUES).default(CUSTOMER_SORT_DEFAULT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const search = input.search?.trim();

      const where: Prisma.CustomerWhereInput = { businessId };

      // Search filter — email, first name or last name, case-insensitive.
      // Tokenized: each whitespace-separated word of the query is required to
      // match SOME field (AND of ORs), not the query as a whole in one field —
      // otherwise searching "John Smith" matches nothing when "John" is the
      // first name and "Smith" is the last, since no single column contains
      // the full string.
      const searchTokens = search ? search.split(/\s+/).filter(Boolean) : [];
      if (searchTokens.length > 0) {
        where.AND = searchTokens.map((token) => ({
          OR: [
            { email: { contains: token, mode: "insensitive" } },
            { firstName: { contains: token, mode: "insensitive" } },
            { lastName: { contains: token, mode: "insensitive" } },
          ],
        }));
      }

      // Marketing opt-in filter
      if (input.marketing === "yes") {
        where.acceptsMarketing = true;
      } else if (input.marketing === "no") {
        where.acceptsMarketing = false;
      }

      // Privacy filter (GDPR/CCPA data-subject requests)
      if (input.privacy === "deletion-requested") {
        where.deletionRequestedAt = { not: null };
        // Defence in depth, not a live predicate: `anonymize` clears
        // `deletionRequestedAt` in the same update that sets `anonymizedAt`
        // (see that mutation), so today an anonymized customer already fails
        // the `deletionRequestedAt: { not: null }` test above and this clause
        // excludes nothing. It stays because this filter's entire job is to be
        // the queue of OUTSTANDING requests, and if that clearing behaviour is
        // ever relaxed — the timestamp is genuine audit data that arguably
        // shouldn't be erased — the queue must not silently start accumulating
        // requests that were already honoured.
        where.anonymizedAt = null;
      } else if (input.privacy === "anonymized") {
        where.anonymizedAt = { not: null };
      }

      // Sort. Each entry is the PRIMARY ordering only — `id` is appended below
      // as a mandatory tie-break, mirroring product.secureList and the
      // guarantee `buildTablePage` makes for the in-memory admin tables
      // (~/app/admin/_lib/table-query). Without it, customers sharing a
      // `createdAt` (a bulk import, a webhook burst) or an `orderCount`/
      // `totalSpent` (every customer with zero orders) have no defined relative
      // order, Postgres is free to return them differently between executions,
      // and with pagination that renders one customer on two pages and another
      // on none.
      type CustomerOrderBy = Prisma.CustomerOrderByWithRelationInput;
      const orderByMap: Record<typeof input.sort, CustomerOrderBy[]> = {
        newest: [{ createdAt: "desc" }],
        oldest: [{ createdAt: "asc" }],
        // `firstName`/`lastName` are both nullable, so `nulls: "last"` is
        // explicit in BOTH directions. Postgres' default (NULLs last for ASC,
        // first for DESC) would make nameless customers leap to the top of the
        // list the moment the sort flips — they are the same uninformative rows
        // either way and belong at the end of both.
        "name-asc": [
          { firstName: { sort: "asc", nulls: "last" } },
          { lastName: { sort: "asc", nulls: "last" } },
        ],
        "name-desc": [
          { firstName: { sort: "desc", nulls: "last" } },
          { lastName: { sort: "desc", nulls: "last" } },
        ],
        "orders-desc": [{ orderCount: "desc" }],
        "spent-desc": [{ totalSpent: "desc" }],
      };
      const orderBy: CustomerOrderBy[] = [
        ...orderByMap[input.sort],
        { id: "asc" },
      ];

      // Pagination — mirrors product.secureList, which in turn matches the
      // PAGE_SIZE the in-memory admin tables use. One number across every admin
      // list, so "page 3" means the same amount of scrolling everywhere.
      const pageSize = 25;
      // Bounded BEFORE it becomes an offset. The clamp further down handles
      // "past the end", but it needs `totalCount` first, so the opening query
      // still runs with whatever `skip` this produces — and an unbounded page
      // number overflows Postgres' OFFSET rather than paging past the end. See
      // MAX_REQUESTED_PAGE.
      const page = Math.min(input.page ?? 1, MAX_REQUESTED_PAGE);
      const skip = (page - 1) * pageSize;

      const filtersActive =
        !!search || input.marketing !== "all" || input.privacy !== "all";

      const [
        [firstPassCustomers, totalCount, marketingCount],
        unfilteredTotal,
      ] = await Promise.all([
        ctx.db.$transaction([
          ctx.db.customer.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
          }),
          ctx.db.customer.count({ where }),
          // Business-wide, NOT filtered — see the note on `totalCustomers`
          // below. When no filter is active `where` IS `{ businessId }`, so
          // this is the same query the filtered version would have been.
          ctx.db.customer.count({
            where: { businessId, acceptsMarketing: true },
          }),
        ]),
        // Only issued when a filter actually narrows the set. Unfiltered,
        // `totalCount` already IS the business-wide total, and the common
        // page load shouldn't pay for a query whose answer it has.
        filtersActive ? ctx.db.customer.count({ where: { businessId } }) : null,
      ]);

      // `Math.max(1, …)` so an empty result set reports one page rather than
      // zero, matching `buildTablePage`.
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      // Clamp an out-of-range page HERE rather than leaving it to callers. An
      // unclamped `?page=900` against a 3-page list echoes `page: 900` back with
      // an empty slice, and a paginator faithfully renders "Showing
      // 44,951–150 of 150" above a no-matches empty state. The re-query only
      // fires on that path — in-app navigation never produces it — so the
      // common case stays a single round trip, and every consumer gets the
      // guarantee that the returned `page` is always within range.
      const clampedPage = Math.min(page, totalPages);
      const customers =
        clampedPage === page
          ? firstPassCustomers
          : await ctx.db.customer.findMany({
              where,
              orderBy,
              skip: (clampedPage - 1) * pageSize,
              take: pageSize,
            });

      // STAFF is fulfillment-only and must not see owner-private CRM notes.
      // Applied to `customers` — the array actually returned — so the clamped
      // re-query above can't slip past the redaction.
      const showNotes = await canViewCustomerNotes(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.platformRole,
        businessId,
      );
      const safeCustomers = showNotes
        ? customers
        : customers.map((c) => ({ ...c, notes: null }));

      return {
        customers: safeCustomers,
        // FILTERED — how many rows match the current search/filters, and what
        // the paginator counts pages against.
        totalCount,
        page: clampedPage,
        pageSize,
        totalPages,
        stats: {
          // UNFILTERED, business-wide. The admin page needs a genuinely
          // unfiltered total to tell "no customers yet" apart from "no matches"
          // — and `totalCount` cannot supply it, because a search matching
          // nothing reports zero and would tell a 400-customer store it has
          // none.
          totalCustomers: unfilteredTotal ?? totalCount,
          marketingCount,
        },
      };
    }),
});
