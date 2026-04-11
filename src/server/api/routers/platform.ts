import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, platformAdminProcedure } from "~/server/api/trpc";

export const platformRouter = createTRPCRouter({
  // User Management
  listUsers: platformAdminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            platformRole: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        users,
        total,
        hasMore: offset + users.length < total,
      };
    }),

  getUser: platformAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              business: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                  customDomain: true,
                  status: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Business Management
  listBusinesses: platformAdminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { subdomain: { contains: search, mode: "insensitive" as const } },
              {
                customDomain: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {};

      const [businesses, total] = await Promise.all([
        ctx.db.business.findMany({
          where,
          select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
            status: true,
            ownerEmail: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        ctx.db.business.count({ where }),
      ]);

      return {
        businesses,
        total,
        hasMore: offset + businesses.length < total,
      };
    }),

  getBusiness: platformAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: businessId }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          slug: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          templateId: true,
          ownerEmail: true,
          supportEmail: true,
          status: true,
          onboardingComplete: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  platformRole: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
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

  // Membership Management
  getBusinessMembers: platformAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: businessId }) => {
      const members = await ctx.db.businessMembership.findMany({
        where: { businessId },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              platformRole: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return members;
    }),

  getUserMemberships: platformAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      const memberships = await ctx.db.businessMembership.findMany({
        where: { userId },
        select: {
          id: true,
          role: true,
          createdAt: true,
          business: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              customDomain: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return memberships;
    }),

  createMembership: platformAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        businessId: z.string(),
        role: z.enum(["OWNER", "MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if business exists
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { id: true, name: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Check if membership already exists
      const existingMembership = await ctx.db.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: input.userId,
            businessId: input.businessId,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this business",
        });
      }

      // Create membership
      const membership = await ctx.db.businessMembership.create({
        data: {
          userId: input.userId,
          businessId: input.businessId,
          role: input.role,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return membership;
    }),

  updateMembership: platformAdminProcedure
    .input(
      z.object({
        membershipId: z.string(),
        role: z.enum(["OWNER", "MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.businessMembership.findUnique({
        where: { id: input.membershipId },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      const updatedMembership = await ctx.db.businessMembership.update({
        where: { id: input.membershipId },
        data: { role: input.role },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          business: {
            select: {
              name: true,
            },
          },
        },
      });

      return updatedMembership;
    }),

  deleteMembership: platformAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: membershipId }) => {
      const membership = await ctx.db.businessMembership.findUnique({
        where: { id: membershipId },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      await ctx.db.businessMembership.delete({
        where: { id: membershipId },
      });

      return { success: true };
    }),

  // Domain Management
  listDomainQueue: platformAdminProcedure.query(async ({ ctx }) => {
    const entries = await ctx.db.domainQueue.findMany({
      where: {
        status: { in: ["pending", "processing", "failed"] },
      },
      orderBy: { createdAt: "asc" },
    });

    const businessIds = [...new Set(entries.map((e) => e.businessId))];

    const businesses = await ctx.db.business.findMany({
      where: { id: { in: businessIds } },
      select: {
        id: true,
        name: true,
        subdomain: true,
        ownerEmail: true,
        customDomain: true,
        domainStatus: true,
      },
    });

    const businessMap = Object.fromEntries(businesses.map((b) => [b.id, b]));

    return entries.map((entry) => ({
      ...entry,
      business: businessMap[entry.businessId] ?? null,
    }));
  }),

  updateDomainStatus: platformAdminProcedure
    .input(
      z.object({
        businessId: z.string(),
        domainStatus: z.enum(["ACTIVE", "PENDING_DNS", "NONE"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { id: true, customDomain: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      if (input.domainStatus === "NONE") {
        // Remove the domain entirely
        await ctx.db.business.update({
          where: { id: input.businessId },
          data: { customDomain: null, domainStatus: "NONE" },
        });

        if (business.customDomain) {
          await ctx.db.domainQueue.updateMany({
            where: { businessId: input.businessId, domain: business.customDomain },
            data: { status: "failed" },
          });
        }
      } else {
        await ctx.db.business.update({
          where: { id: input.businessId },
          data: { domainStatus: input.domainStatus },
        });

        if (input.domainStatus === "ACTIVE" && business.customDomain) {
          await ctx.db.domainQueue.updateMany({
            where: { businessId: input.businessId, domain: business.customDomain },
            data: { status: "completed" },
          });
        }
      }

      return { success: true };
    }),
});
