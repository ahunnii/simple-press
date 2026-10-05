import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TxClient } from "~/server/db";
import { inviteRoleSchema } from "~/lib/validators/platform-invites";
import { createTRPCRouter, platformAdminProcedure } from "~/server/api/trpc";
import {
  buildTeamInviteUrl,
  createTeamInvite,
  listTeamInvites,
  revokeTeamInvite,
} from "~/server/team/invites";

const businessInput = z.object({ businessId: z.string().min(1) });

const inviteInput = businessInput.extend({
  email: z.string().email(),
  role: inviteRoleSchema,
});

const inviteIdInput = businessInput.extend({ inviteId: z.string().min(1) });

/**
 * Hub-side team invites. Mirrors the shop `team` router's invite flow but is
 * keyed by an explicit `businessId` (the hub has no host-resolved tenant).
 * Invite URLs always point at the business's own host so they work from here.
 */
export const platformInvitesRouter = createTRPCRouter({
  list: platformAdminProcedure
    .input(businessInput)
    .query(async ({ ctx, input }) => {
      const business = await requireBusiness(ctx.db, input.businessId);
      const { pendingInvites, expiredInvites } = await listTeamInvites(
        ctx.db,
        input.businessId,
      );

      return {
        pendingInvites: pendingInvites.map((invite) => ({
          ...invite,
          inviteUrl: buildTeamInviteUrl(invite.code, business),
        })),
        expiredInvites,
      };
    }),

  invite: platformAdminProcedure
    .input(inviteInput)
    .mutation(async ({ ctx, input }) => {
      await requireBusiness(ctx.db, input.businessId);
      const { invite, emailSent, inviteUrl } = await createTeamInvite(ctx.db, {
        businessId: input.businessId,
        actorUserId: ctx.session.user.id,
        email: input.email,
        role: input.role,
      });

      return { invite, emailSent, inviteUrl };
    }),

  revoke: platformAdminProcedure
    .input(inviteIdInput)
    .mutation(async ({ ctx, input }) => {
      await requireBusiness(ctx.db, input.businessId);
      await revokeTeamInvite(ctx.db, {
        businessId: input.businessId,
        inviteId: input.inviteId,
      });
      return { success: true };
    }),

  /**
   * Revoke the existing invite (pending or expired) and issue a fresh one with
   * the same email + role. Sequential rather than transactional: the create
   * step sends an email, which must not run inside an open DB transaction.
   * The revoke has to come first because `createTeamInvite` rejects while an
   * active invite for the same email exists.
   */
  resend: platformAdminProcedure
    .input(inviteIdInput)
    .mutation(async ({ ctx, input }) => {
      await requireBusiness(ctx.db, input.businessId);

      const existing = await ctx.db.teamInvite.findUnique({
        where: { id: input.inviteId },
        select: {
          id: true,
          businessId: true,
          email: true,
          role: true,
          used: true,
        },
      });
      if (existing?.businessId !== input.businessId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }
      if (existing.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite has already been used",
        });
      }

      await revokeTeamInvite(ctx.db, {
        businessId: input.businessId,
        inviteId: existing.id,
      });

      const { invite, emailSent, inviteUrl } = await createTeamInvite(ctx.db, {
        businessId: input.businessId,
        actorUserId: ctx.session.user.id,
        email: existing.email,
        role: existing.role,
      });

      return { invite, emailSent, inviteUrl };
    }),
});

async function requireBusiness(db: TxClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { subdomain: true, customDomain: true, domainStatus: true },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return business;
}
