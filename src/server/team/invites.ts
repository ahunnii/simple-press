import crypto from "crypto";
import { TRPCError } from "@trpc/server";

import type { TxClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { sendTeamInviteEmail } from "~/lib/email/templates";

export type InviteRole = "OWNER" | "MANAGER" | "STAFF";

type InviteBusiness = {
  subdomain: string | null;
  customDomain: string | null;
  domainStatus: string | null;
};

/**
 * Invite links point at the *business's own* domain (custom domain when
 * ACTIVE, else its subdomain) — never the bare platform domain.
 *
 * Sessions are per-host (no cross-subdomain cookie is configured), so signing
 * in on the platform domain would not authenticate the member on the store
 * they were invited to. Landing them on the store's own host means they sign
 * in exactly once, on the host where the session is actually needed — and
 * they never see an unfamiliar platform domain in the process.
 */
export function buildTeamInviteUrl(
  code: string,
  business: InviteBusiness,
): string {
  const base = getBusinessUrl({
    subdomain: business.subdomain ?? "",
    customDomain: business.customDomain,
    domainStatus: business.domainStatus,
  });
  return `${base}/auth/accept-invite?code=${code}`;
}

/**
 * Pending (still usable) and expired (unused but past `expiresAt`) invites for
 * one business. Shared by the shop `team.list` and the hub `platformInvites.list`.
 */
export async function listTeamInvites(db: TxClient, businessId: string) {
  // Shared instant for both invite queries below, so a request landing
  // exactly on the expiry boundary can't put the same invite in neither
  // (or both) of the two lists — `gt`/`lte` on two separate `new Date()`
  // calls could otherwise disagree by however long the first query took.
  const now = new Date();

  const [pendingInvites, expiredInvites] = await Promise.all([
    db.teamInvite.findMany({
      where: {
        businessId,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    }),
    // A separate array, not a loosened filter on `pendingInvites` — that
    // field's meaning ("still usable") must not shift for the test suite
    // or anything else already reading it. Expired invites can't be
    // revoked (`revokeInvite` just sets `used: true`, which is meaningless
    // once an invite is already dead) so the UI only offers Resend here.
    db.teamInvite.findMany({
      where: {
        businessId,
        used: false,
        expiresAt: { lte: now },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { pendingInvites, expiredInvites };
}

/**
 * Create a team invite and email it. Throws BAD_REQUEST for an existing member
 * or an active invite for the same email, NOT_FOUND for an unknown business.
 */
export async function createTeamInvite(
  db: TxClient,
  input: {
    businessId: string;
    actorUserId: string;
    email: string;
    role: InviteRole;
  },
) {
  const { businessId, actorUserId, email, role } = input;

  // Check for existing membership
  const existingMember = await db.businessMembership.findFirst({
    where: {
      businessId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
  });
  if (existingMember) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A team member with this email already exists",
    });
  }

  // Duplicate-active-invite guard
  const existingActive = await db.teamInvite.findFirst({
    where: {
      businessId,
      email: { equals: email, mode: "insensitive" },
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

  const business = await db.business.findUnique({
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
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Business not found",
    });
  }

  const code = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const invite = await db.teamInvite.create({
    data: {
      businessId,
      email,
      code,
      role,
      expiresAt,
      createdBy: actorUserId,
    },
  });

  const inviteUrl = buildTeamInviteUrl(code, business);

  // The invite row above is already committed — `sendEmail` never
  // throws (see its docblock), so a Resend failure can't roll that back
  // anyway. Throwing here would report a failed mutation for a write
  // that actually succeeded, so the outcome is surfaced as a return
  // field instead and left for the caller to react to.
  const emailResult = await sendTeamInviteEmail({
    to: email,
    businessName: business.name,
    inviteUrl,
    role,
    logoUrl: business.siteContent?.logoUrl ?? undefined,
    ownerEmail: business.ownerEmail,
  });

  return { invite, emailSent: emailResult.success, inviteUrl };
}

/**
 * Revoke (mark used) an unused invite. The `businessId` check is the tenant
 * scoping guard: an invite belonging to another business is NOT_FOUND.
 */
export async function revokeTeamInvite(
  db: TxClient,
  input: { businessId: string; inviteId: string },
) {
  const { businessId, inviteId } = input;

  const invite = await db.teamInvite.findUnique({
    where: { id: inviteId },
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
  return db.teamInvite.update({
    where: { id: inviteId },
    data: { used: true, usedAt: new Date() },
  });
}
