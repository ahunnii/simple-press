import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getBusinessUrl } from "~/lib/business-url";
import {
  createTeamInvite,
  listTeamInvites,
  revokeTeamInvite,
} from "~/server/team/invites";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const teamRouter = createTRPCRouter({
  // ─── READ ─────────────────────────────────────────────────────────────────

  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const [memberships, { pendingInvites, expiredInvites }] = await Promise.all(
      [
        ctx.db.businessMembership.findMany({
          where: { businessId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        listTeamInvites(ctx.db, businessId),
      ],
    );

    return { memberships, pendingInvites, expiredInvites };
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

      // Explicit projection — three fields, never the row.
      //
      // This is a `publicProcedure` keyed on an invite code, so everything it
      // returns is readable by whoever holds that code. `email` is here
      // DELIBERATELY: `AcceptInviteClient` renders "Sign in or create an account
      // with <email>" and compares it against the signed-in session to warn
      // "this invitation was sent to X, but you're signed in as Y". Removing it
      // breaks that screen. The disclosure is acceptable because the code itself
      // was mailed to that address — a code holder is the invitee, or someone
      // they forwarded it to.
      //
      // What must NOT happen is this becoming `return invite`, which would also
      // hand out `code`, `businessId`, `createdBy` and the raw timestamps. That
      // is the shape that leaked in `testimonial.getInvite`; a regression test in
      // tests/integration/team.test.ts pins this projection.
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

      // The member must land on the *business's* admin (its own subdomain or
      // custom domain) — /admin on the platform domain has no tenant context.
      // Invite links now point at that host already, so an accepting member is
      // signed in there and can go straight to the dashboard: admin role checks
      // resolve the membership live (see `requireAdminAccess`), so no re-sign-in
      // is needed for the new role to take effect. A member arriving from a
      // legacy platform-domain link simply gets bounced to that host's sign-in.
      const business = await ctx.db.business.findUnique({
        where: { id: invite.businessId },
        select: { subdomain: true, customDomain: true, domainStatus: true },
      });
      const adminUrl = business
        ? `${getBusinessUrl({
            subdomain: business.subdomain ?? "",
            customDomain: business.customDomain,
            domainStatus: business.domainStatus,
          })}/admin/dashboard`
        : "/admin/dashboard";

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
        return { success: true, businessId: invite.businessId, adminUrl };
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

      return { success: true, businessId: invite.businessId, adminUrl };
    }),

  // ─── OWNER-ONLY MUTATIONS ─────────────────────────────────────────────────

  invite: ownerOnlyProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["OWNER", "MANAGER", "STAFF"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invite, emailSent } = await createTeamInvite(ctx.db, {
        businessId: ctx.businessId,
        actorUserId: ctx.session.user.id,
        email: input.email,
        role: input.role,
      });

      return { ...invite, emailSent };
    }),

  changeRole: ownerOnlyProcedure
    .input(
      z.object({
        membershipId: z.string(),
        role: z.enum(["OWNER", "MANAGER", "STAFF"]),
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
    .mutation(({ ctx, input }) =>
      revokeTeamInvite(ctx.db, {
        businessId: ctx.businessId,
        inviteId: input.inviteId,
      }),
    ),
});
