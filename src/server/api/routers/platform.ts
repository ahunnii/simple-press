import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { MerchantPolicyLog } from "~/lib/legal/terms-status";
import { env } from "~/env";
import {
  BUSINESS_TYPE_IDS,
  FEATURE_PRESETS,
  SETUP_PRESETS,
  SETUP_STEP_KEYS,
  SETUP_STEP_LEVELS,
} from "~/lib/admin/setup-plan";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import {
  findMaterialUpdate,
  isPending,
  latestMaterialUpdate,
  MATERIAL_POLICY_UPDATES,
  policyToday,
} from "~/lib/legal/material-updates";
import {
  listPolicyNoticeRecipients,
  sendPolicyUpdateNoticeBatches,
} from "~/lib/legal/policy-update-notice-send.server";
import { MERCHANT_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { buildBusinessBrief } from "~/lib/platform/business-brief";
import { isTemplateAvailableForSubdomain } from "~/lib/template-ownership";
import { isSubdomainReserved, slugify } from "~/lib/utils";
import { createTRPCRouter, platformAdminProcedure } from "~/server/api/trpc";
import { createTeamInvite } from "~/server/team/invites";

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
            templateId: true,
            domainStatus: true,
            stripeAccountId: true,
            stripeChargesEnabled: true,
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
                userId: true,
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

      // PolicyAcceptance log rows that can make an owner with an older column
      // version "current": a notice-ack of the latest material merchant
      // update, or a clickwrap at the current version. One query for the whole
      // page. Skipped until a material merchant update exists (until then
      // every log row duplicates a column stamp). `merchantPolicyLog` is null
      // only when no material merchant update is announced → exact-version
      // column status. If the log table is unreadable (not applied yet) the
      // rows are simply empty, but the announcement date still lets owners who
      // clickwrapped after the update count as current.
      const latestMerchantUpdate = latestMaterialUpdate(
        MATERIAL_POLICY_UPDATES,
        new Date(),
        "merchant",
      );
      let logRows:
        | {
            businessId: string | null;
            userId: string;
            version: string;
            acceptedAt: Date;
          }[]
        | null = null;
      if (latestMerchantUpdate && businesses.length > 0) {
        try {
          logRows = await ctx.db.policyAcceptance.findMany({
            where: {
              businessId: { in: businesses.map((b) => b.id) },
              bundle: "merchant",
              version: {
                in: [MERCHANT_TERMS_VERSION, latestMerchantUpdate.id],
              },
            },
            select: {
              businessId: true,
              userId: true,
              version: true,
              acceptedAt: true,
            },
          });
        } catch (error) {
          Sentry.captureException(error, {
            tags: { legal: "policy-acceptance-log" },
          });
          logRows = null;
        }
      }

      return {
        businesses: businesses.map((business) => {
          const merchantPolicyLog: MerchantPolicyLog | null =
            latestMerchantUpdate
              ? {
                  latestUpdateId: latestMerchantUpdate.id,
                  latestUpdateAnnouncedOn: latestMerchantUpdate.announcedOn,
                  rows: (logRows ?? [])
                    .filter((row) => row.businessId === business.id)
                    .map(({ userId, version, acceptedAt }) => ({
                      userId,
                      version,
                      acceptedAt,
                    })),
                }
              : null;
          return { ...business, merchantPolicyLog };
        }),
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
        businessType: z.enum(BUSINESS_TYPE_IDS).default("products"),
        // Partial map, merged over the type's preset — the saved value is
        // always the full map (see setup-plan.ts).
        setupSteps: z
          .record(z.enum(SETUP_STEP_KEYS), z.enum(SETUP_STEP_LEVELS))
          .optional(),
        // Overrides only, layered over registry defaults. Omitted → the
        // type's FEATURE_PRESETS.
        featureFlags: z.record(z.string(), z.boolean()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (isSubdomainReserved(input.subdomain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This subdomain is reserved",
        });
      }

      // Same check as `platformBusiness.setTemplate`: commercial templates are
      // locked to their owning subdomain — here, the one being created.
      if (!isTemplateAvailableForSubdomain(input.templateId, input.subdomain)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This template is not available for this subdomain.",
        });
      }

      const featureFlags =
        input.featureFlags ?? FEATURE_PRESETS[input.businessType];
      const unknownKeys = Object.keys(featureFlags).filter(
        (key) => !FEATURE_REGISTRY[key],
      );
      if (unknownKeys.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown feature flag(s): ${unknownKeys.join(", ")}`,
        });
      }

      const setupSteps = {
        ...SETUP_PRESETS[input.businessType],
        ...input.setupSteps,
      };

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

      // `Business.slug` is unique — suffix until free (same loop as
      // self-serve onboarding).
      const baseSlug = slugify(input.name) || "store";
      let slug = baseSlug;
      for (let counter = 1; counter <= 100; counter++) {
        const slugTaken = await ctx.db.business.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!slugTaken) break;
        slug = `${baseSlug}-${counter}`;
      }

      const business = await ctx.db.$transaction(async (tx) => {
        const newBusiness = await tx.business.create({
          data: {
            name: input.name,
            slug,
            subdomain: input.subdomain,
            templateId: input.templateId,
            ownerEmail: input.ownerEmail ?? "",
            status: "active",
            onboardingComplete: false,
            domainStatus: "NONE",
            businessType: input.businessType,
            setupSteps,
            featureFlags,
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

      // Invite after the commit (it sends an email). The store already
      // exists at this point, so a failed invite is reported back rather
      // than failing the create — the admin can re-invite from its page.
      let invite: { emailSent: boolean; inviteUrl: string } | null = null;
      let inviteError: string | undefined;
      if (input.ownerEmail) {
        try {
          const result = await createTeamInvite(ctx.db, {
            businessId: business.id,
            actorUserId: ctx.session.user.id,
            email: input.ownerEmail,
            role: "OWNER",
          });
          invite = { emailSent: result.emailSent, inviteUrl: result.inviteUrl };
        } catch (err) {
          if (!(err instanceof TRPCError)) {
            Sentry.captureException(err, {
              tags: {
                "trpc.procedure": "platform.createBusiness",
                step: "owner-invite",
                businessId: business.id,
              },
            });
          }
          inviteError =
            err instanceof TRPCError
              ? err.message
              : "Could not create the owner invite";
        }
      }

      return {
        id: business.id,
        name: business.name,
        subdomain: business.subdomain,
        invite,
        inviteError,
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

  /**
   * Compact public markdown brief for a platform admin to paste into an LLM.
   * Read-only — writes nothing and connects to no AI provider.
   */
  getBusinessBrief: platformAdminProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => ({
      markdown: await buildBusinessBrief(input.businessId),
    })),

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

  // ─── Policy update notices ────────────────────────────────────────────────
  //
  // The registry of MATERIAL policy updates lives in code
  // (`~/lib/legal/material-updates`); `PolicyNotice` is only the send ledger
  // that makes the email send once. See that file for the ritual.

  /**
   * Every registry entry with its send status, for the platform-hub panel.
   * `notice` is `"unknown"` when the ledger table cannot be read (not applied
   * yet) — the panel then says so instead of claiming "not sent".
   */
  listPolicyUpdates: platformAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = policyToday(now);

    let ledger: Map<string, { sentAt: Date; recipientCount: number }> | null =
      null;
    try {
      const rows = await ctx.db.policyNotice.findMany({
        select: { updateId: true, sentAt: true, recipientCount: true },
      });
      ledger = new Map(
        rows.map((row) => [
          row.updateId,
          { sentAt: row.sentAt, recipientCount: row.recipientCount },
        ]),
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { legal: "policy-notice-ledger" },
      });
    }

    return MATERIAL_POLICY_UPDATES.map((update) => ({
      id: update.id,
      documents: [...update.documents],
      announcedOn: update.announcedOn,
      effectiveOn: update.effectiveOn,
      summary: update.summary,
      announced: update.announcedOn <= today,
      pending: isPending(update, now),
      notice: ledger
        ? (():
            | { state: "sent"; sentAt: Date; recipientCount: number }
            | { state: "not-sent" } => {
            const row = ledger.get(update.id);
            return row ? { state: "sent", ...row } : { state: "not-sent" };
          })()
        : ({ state: "unknown" } as const),
    })).sort((a, b) => b.announcedOn.localeCompare(a.announcedOn));
  }),

  /** How many owners a send would email — for the confirm dialog. */
  previewPolicyUpdateNotice: platformAdminProcedure
    .input(z.object({ updateId: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      if (!findMaterialUpdate(MATERIAL_POLICY_UPDATES, input.updateId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No such policy update in the registry.",
        });
      }
      const recipients = await listPolicyNoticeRecipients(ctx.db);
      return { recipientCount: recipients.length };
    }),

  /**
   * Email the "Updates to SimplePress policies" notice to every store owner,
   * once per registry entry.
   *
   * - The update must exist in `MATERIAL_POLICY_UPDATES` and be announced.
   * - Idempotent: if a `PolicyNotice` row exists the call is a no-op returning
   *   `{ alreadySent: true }`. If the ledger cannot be read the send is
   *   REFUSED — we cannot prove it has not gone out.
   * - Transactional legal notice: ignores marketing opt-outs on purpose.
   * - The ledger row is written only after every batch was accepted. If a
   *   batch fails, nothing is recorded and the error says so; re-running
   *   within Resend's 24h idempotency window re-sends only what failed.
   * - On the preview env (`IS_PREVIEW_ENV`) mail is suppressed/redirected by
   *   the Resend wrapper, so no ledger row is written there.
   */
  sendPolicyUpdateNotice: platformAdminProcedure
    .input(z.object({ updateId: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const update = findMaterialUpdate(
        MATERIAL_POLICY_UPDATES,
        input.updateId,
      );
      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No such policy update in the registry.",
        });
      }
      if (update.announcedOn > policyToday(new Date())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This update is not announced until ${update.announcedOn}.`,
        });
      }

      let existing: { sentAt: Date; recipientCount: number } | null;
      try {
        existing = await ctx.db.policyNotice.findUnique({
          where: { updateId: update.id },
          select: { sentAt: true, recipientCount: true },
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { legal: "policy-notice-ledger" },
        });
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Can't read the PolicyNotice table, so a duplicate send can't be ruled out. Apply prisma/manual/2026-10-21-policy-acceptance-log.sql first.",
        });
      }
      if (existing) {
        return {
          alreadySent: true as const,
          sentAt: existing.sentAt,
          recipientCount: existing.recipientCount,
        };
      }

      const recipients = await listPolicyNoticeRecipients(ctx.db);
      if (recipients.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "There are no store owners to notify.",
        });
      }

      const result = await sendPolicyUpdateNoticeBatches({
        update,
        recipients,
      });
      if (result.failedRecipients > 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `The email provider refused ${result.failedRecipients} of ${recipients.length} recipients (${result.firstError ?? "unknown error"}). Nothing was recorded as sent. Running it again re-sends only the failed batches if you do it within 24 hours.`,
        });
      }

      const sentAt = new Date();
      let recorded = false;
      if (!env.IS_PREVIEW_ENV) {
        try {
          await ctx.db.policyNotice.create({
            data: {
              updateId: update.id,
              sentAt,
              recipientCount: result.accepted,
            },
          });
          recorded = true;
        } catch (error) {
          // The emails are out. A unique-violation means a concurrent send won;
          // anything else is reported and surfaced via `recorded: false`.
          if (
            !(
              error instanceof Error &&
              "code" in error &&
              (error as { code?: unknown }).code === "P2002"
            )
          ) {
            Sentry.captureException(error, {
              tags: { legal: "policy-notice-ledger" },
            });
          }
        }
      }

      return {
        alreadySent: false as const,
        sentAt,
        recipientCount: result.accepted,
        rejected: result.rejected,
        recorded,
      };
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
