import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { sendTeamInviteEmail } from "~/lib/email/templates";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

function buildTeamInviteUrl(code: string): string {
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:3000/auth/accept-invite?code=${code}`;
  }
  return `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/auth/accept-invite?code=${code}`;
}

export const teamRouter = createTRPCRouter({
  // ─── READ ─────────────────────────────────────────────────────────────────

  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const [memberships, pendingInvites] = await Promise.all([
      ctx.db.businessMembership.findMany({
        where: { businessId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      ctx.db.teamInvite.findMany({
        where: {
          businessId,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { memberships, pendingInvites };
  }),

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  getInvite: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.teamInvite.findUnique({
        where: { code: input.code },
        include: {
          business: { select: { name: true } },
        },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }
      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });
      }
      if (new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has expired",
        });
      }

      return {
        businessName: invite.business.name,
        email: invite.email,
        role: invite.role,
      };
    }),

  // ─── ACCEPT ───────────────────────────────────────────────────────────────

  acceptInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.teamInvite.findUnique({
        where: { code: input.code },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }
      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });
      }
      if (new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has expired",
        });
      }

      const userEmail = ctx.session.user.email;
      if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite was sent to a different email address",
        });
      }

      // Guard against duplicate membership
      const existing = await ctx.db.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: ctx.session.user.id,
            businessId: invite.businessId,
          },
        },
      });

      if (existing) {
        // Already a member — mark invite used and return success
        await ctx.db.teamInvite.update({
          where: { id: invite.id },
          data: { used: true, usedAt: new Date() },
        });
        return { success: true, businessId: invite.businessId };
      }

      // Create membership + mark invite used in a transaction
      await ctx.db.$transaction([
        ctx.db.businessMembership.create({
          data: {
            userId: ctx.session.user.id,
            businessId: invite.businessId,
            role: invite.role,
          },
        }),
        ctx.db.teamInvite.update({
          where: { id: invite.id },
          data: { used: true, usedAt: new Date() },
        }),
      ]);

      return { success: true, businessId: invite.businessId };
    }),

  // ─── OWNER-ONLY MUTATIONS ─────────────────────────────────────────────────

  invite: ownerOnlyProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["OWNER", "MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Check for existing membership
      const existingMember = await ctx.db.businessMembership.findFirst({
        where: {
          businessId,
          user: { email: { equals: input.email, mode: "insensitive" } },
        },
      });
      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A team member with this email already exists",
        });
      }

      // Duplicate-active-invite guard
      const existingActive = await ctx.db.teamInvite.findFirst({
        where: {
          businessId,
          email: { equals: input.email, mode: "insensitive" },
          used: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (existingActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An active invitation already exists for this email",
        });
      }

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          name: true,
          ownerEmail: true,
          subdomain: true,
          customDomain: true,
          domainStatus: true,
          siteContent: { select: { logoUrl: true } },
        },
      });

      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      const code = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const invite = await ctx.db.teamInvite.create({
        data: {
          businessId,
          email: input.email,
          code,
          role: input.role,
          expiresAt,
          createdBy: ctx.session.user.id,
        },
      });

      const inviteUrl = buildTeamInviteUrl(code);

      await sendTeamInviteEmail({
        to: input.email,
        businessName: business.name,
        inviteUrl,
        role: input.role,
        logoUrl: business.siteContent?.logoUrl ?? undefined,
        ownerEmail: business.ownerEmail,
      });

      return invite;
    }),

  changeRole: ownerOnlyProcedure
    .input(
      z.object({
        membershipId: z.string(),
        role: z.enum(["OWNER", "MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const membership = await ctx.db.businessMembership.findUnique({
        where: { id: input.membershipId },
        select: { id: true, businessId: true, role: true },
      });

      if (membership?.businessId !== businessId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      // Last-owner protection: if demoting from OWNER, ensure at least one other OWNER remains
      if (membership.role === "OWNER" && input.role !== "OWNER") {
        const ownerCount = await ctx.db.businessMembership.count({
          where: { businessId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot demote the last owner. Promote another member to Owner first.",
          });
        }
      }

      return ctx.db.businessMembership.update({
        where: { id: input.membershipId },
        data: { role: input.role },
      });
    }),

  remove: ownerOnlyProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const membership = await ctx.db.businessMembership.findUnique({
        where: { id: input.membershipId },
        select: { id: true, businessId: true, role: true, userId: true },
      });

      if (membership?.businessId !== businessId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      // Last-owner protection
      if (membership.role === "OWNER") {
        const ownerCount = await ctx.db.businessMembership.count({
          where: { businessId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner. Transfer ownership first.",
          });
        }
      }

      return ctx.db.businessMembership.delete({
        where: { id: input.membershipId },
      });
    }),

  revokeInvite: ownerOnlyProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const invite = await ctx.db.teamInvite.findUnique({
        where: { id: input.inviteId },
        select: { id: true, businessId: true, used: true },
      });

      if (invite?.businessId !== businessId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }
      if (invite.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot revoke a used invite",
        });
      }

      // Mark as used to effectively revoke it
      return ctx.db.teamInvite.update({
        where: { id: input.inviteId },
        data: { used: true, usedAt: new Date() },
      });
    }),
});
