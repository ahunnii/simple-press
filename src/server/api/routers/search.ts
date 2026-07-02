import type { Prisma } from "generated/prisma";
import { z } from "zod";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";

/**
 * Global admin record search — powers the ⌘K command palette.
 *
 * SECURITY: every lookup below is scoped to `ctx.businessId` (the tenant
 * resolved from the request hostname by `staffProcedure`). Role gating is
 * re-derived from the DB against that same resolved `businessId` so a stale
 * session role can never widen access.
 */
export const searchRouter = createTRPCRouter({
  all: staffProcedure
    .input(z.object({ query: z.string().trim().min(2).max(100) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const user = ctx.session.user;
      const q = input.query;

      // ── Role gating ──────────────────────────────────────────────────────
      // STAFF may only see orders + customers (mirrors STAFF_ALLOWED_PATH_
      // PREFIXES in admin-nav). Re-read the membership role for the resolved
      // business rather than trusting the session copy. PLATFORM_ADMIN has no
      // membership row but bypasses the check (full access).
      const isPlatformAdmin = user.platformRole === "PLATFORM_ADMIN";
      let isStaff = false;
      if (!isPlatformAdmin) {
        const membership = await ctx.db.businessMembership.findUnique({
          where: { userId_businessId: { userId: user.id, businessId } },
          select: { role: true },
        });
        isStaff = membership?.role === "STAFF";
      }

      // ── Feature gating ───────────────────────────────────────────────────
      // Skip the products lookup entirely when the products feature is off.
      const { isEnabled } = await getBusinessFlags();
      const canSearchProducts = !isStaff && isEnabled("products");

      // Numeric-ish queries can hit the order number directly.
      const numericQuery = /^#?\d+$/.test(q)
        ? Number.parseInt(q.replace(/^#/, ""), 10)
        : null;

      const orderWhere: Prisma.OrderWhereInput = {
        businessId,
        OR: [
          ...(numericQuery !== null && Number.isFinite(numericQuery)
            ? [{ orderNumber: numericQuery }]
            : []),
          { customerEmail: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerFirstName: { contains: q, mode: "insensitive" } },
          { customerLastName: { contains: q, mode: "insensitive" } },
        ],
      };

      const customerWhere: Prisma.CustomerWhereInput = {
        businessId,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      };

      const productWhere: Prisma.ProductWhereInput = {
        businessId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      };

      const [orderRows, customerRows, productRows] = await Promise.all([
        ctx.db.order.findMany({
          where: orderWhere,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            total: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        ctx.db.customer.findMany({
          where: customerWhere,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            orderCount: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        canSearchProducts
          ? ctx.db.product.findMany({
              where: productWhere,
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                published: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
      ]);

      return {
        orders: orderRows.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          total: o.total, // Int cents — plain serializable number
          status: o.status,
          createdAt: o.createdAt,
        })),
        customers: customerRows.map((c) => ({
          id: c.id,
          name:
            [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || null,
          email: c.email,
          orderCount: c.orderCount,
        })),
        products: productRows.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price, // Float — plain serializable number
          published: p.published,
        })),
      };
    }),
});
