import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import { isSubdomainReserved, slugify } from "~/lib/utils";
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
            // Platform ToS + Privacy acceptance (see policy-versions.ts). Null
            // is expected and common on day one — nothing was backfilled.
            termsAcceptedAt: true,
            termsVersion: true,
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
          termsAcceptedAt: true,
          termsVersion: true,
          memberships: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              // Seller & Merchant Agreement + Acceptable Use, per membership —
              // one person can own two stores and accept separately for each.
              merchantTermsAcceptedAt: true,
              merchantTermsVersion: true,
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
                customDomain: {
                  contains: search,
                  mode: "insensitive" as const,
                },
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
            // Merchant terms status is computed client-side from just the
            // OWNER memberships (never STAFF/MANAGER — the agreement is the
            // owner's). This nested select is answered in the same query
            // Prisma already issues for the page of rows, not one query per
            // business, so it does not add an N+1.
            memberships: {
              where: { role: "OWNER" },
              select: {
                merchantTermsAcceptedAt: true,
                merchantTermsVersion: true,
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
        role: z.enum(["OWNER", "MANAGER", "STAFF"]),
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
        role: z.enum(["OWNER", "MANAGER", "STAFF"]),
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

      // Last-owner protection: never let a business be left with zero OWNERs by
      // demoting its final OWNER to a lesser role.
      if (membership.role === "OWNER" && input.role !== "OWNER") {
        const ownerCount = await ctx.db.businessMembership.count({
          where: { businessId: membership.businessId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot demote the last owner of this business. Promote another member to Owner first.",
          });
        }
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

      // Last-owner protection: never let a business be left with zero OWNERs by
      // deleting its final OWNER membership.
      if (membership.role === "OWNER") {
        const ownerCount = await ctx.db.businessMembership.count({
          where: { businessId: membership.businessId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete the last owner of this business. Transfer ownership first.",
          });
        }
      }

      await ctx.db.businessMembership.delete({
        where: { id: membershipId },
      });

      return { success: true };
    }),

  createBusiness: platformAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        subdomain: z
          .string()
          .min(3)
          .max(63)
          .regex(
            /^[a-z0-9-]+$/,
            "Subdomain may only contain lowercase letters, numbers, and hyphens",
          ),
        templateId: z.string().default("modern"),
        ownerEmail: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (isSubdomainReserved(input.subdomain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This subdomain is reserved",
        });
      }

      const existing = await ctx.db.business.findUnique({
        where: { subdomain: input.subdomain },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This subdomain is already taken",
        });
      }

      const business = await ctx.db.$transaction(async (tx) => {
        const newBusiness = await tx.business.create({
          data: {
            name: input.name,
            slug: slugify(input.name),
            subdomain: input.subdomain,
            templateId: input.templateId,
            ownerEmail: input.ownerEmail ?? "",
            status: "active",
            onboardingComplete: false,
            domainStatus: "NONE",
          },
        });

        await tx.siteContent.create({
          data: {
            businessId: newBusiness.id,
            heroTitle: `Welcome to ${input.name}`,
            heroSubtitle: "",
            aboutText: "",
            primaryColor: "#3b82f6",
            secondaryColor: "#ffffff",
            accentColor: "#3b82f6",
          },
        });

        return newBusiness;
      });

      return {
        id: business.id,
        name: business.name,
        subdomain: business.subdomain,
      };
    }),

  // Business status (active | suspended | closed). Enforcement lives in
  // ownerAdminProcedure/staffProcedure/ownerOnlyProcedure/getBusinessProcedure
  // (`~/server/api/trpc.ts`) and trustedOrigins (`~/server/better-auth/config.tsx`)
  // — this mutation only ever writes the column; it never touches enforcement.
  setBusinessStatus: platformAdminProcedure
    .input(
      z.object({
        businessId: z.string(),
        status: z.enum(["active", "suspended", "closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { id: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const updated = await ctx.db.business.update({
        where: { id: input.businessId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
        },
      });

      return updated;
    }),

  // Feature Flag Management
  getBusinessFlags: platformAdminProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { featureFlags: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Same resolution as features.getFlags: defaults merged with stored overrides
      const defaults = getDefaultFlags();
      const stored = (business.featureFlags as Record<string, boolean>) ?? {};
      const merged = { ...defaults, ...stored };
      const disabledByDependency = getDisabledDueToDependency(merged);

      return {
        flags: merged,
        disabledByDependency: [...disabledByDependency],
      };
    }),

  setBusinessFlags: platformAdminProcedure
    .input(
      z.object({
        businessId: z.string(),
        flags: z.record(z.string(), z.boolean()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unknownKeys = Object.keys(input.flags).filter(
        (key) => !FEATURE_REGISTRY[key],
      );

      if (unknownKeys.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown feature flag(s): ${unknownKeys.join(", ")}`,
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: input.businessId },
        select: { featureFlags: true },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Mirror features.adminSetFlags: merge incoming flags over stored ones
      const current = (business.featureFlags as Record<string, boolean>) ?? {};
      const updated = { ...current, ...input.flags };

      await ctx.db.business.update({
        where: { id: input.businessId },
        data: { featureFlags: updated },
      });

      return { success: true };
    }),

  getMaintenance: platformAdminProcedure.query(async ({ ctx }) => {
    const config = await ctx.db.platformConfig.findUnique({
      where: { id: "singleton" },
    });
    return {
      enabled: config?.maintenanceMode ?? false,
      message: config?.maintenanceMessage ?? null,
    };
  }),

  setMaintenance: platformAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        message: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.platformConfig.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          maintenanceMode: input.enabled,
          maintenanceMessage: input.message ?? null,
        },
        update: {
          maintenanceMode: input.enabled,
          maintenanceMessage: input.message ?? null,
        },
      });
      return { success: true };
    }),

  getDashboardStats: platformAdminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalBusinesses,
      newUsers30d,
      newBusinesses30d,
      activeBusinesses,
      pendingDomains,
      businessesWithoutAcceptedOwner,
      recentUsers,
      recentBusinesses,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.business.count(),
      ctx.db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.business.count({ where: { status: "active" } }),
      ctx.db.domainQueue.count({
        where: { status: { in: ["pending", "processing", "failed"] } },
      }),
      // Businesses with no OWNER membership that has ever accepted the Seller
      // & Merchant Agreement — the only document that grants the platform
      // grounds to suspend a store. `none: { role: "OWNER", merchantTermsAcceptedAt: { not: null } }`
      // compiles to a single NOT EXISTS subquery, so this is one count query
      // regardless of how many businesses or memberships exist — no N+1, and
      // no need to pull membership rows into app code just to count.
      ctx.db.business.count({
        where: {
          memberships: {
            none: {
              role: "OWNER",
              merchantTermsAcceptedAt: { not: null },
            },
          },
        },
      }),
      ctx.db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          createdAt: true,
        },
      }),
      ctx.db.business.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          subdomain: true,
          status: true,
          ownerEmail: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers,
      totalBusinesses,
      newUsers30d,
      newBusinesses30d,
      activeBusinesses,
      pendingDomains,
      businessesWithoutAcceptedOwner,
      recentUsers,
      recentBusinesses,
    };
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
            where: {
              businessId: input.businessId,
              domain: business.customDomain,
            },
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
            where: {
              businessId: input.businessId,
              domain: business.customDomain,
            },
            data: { status: "completed" },
          });
        }
      }

      return { success: true };
    }),
});
