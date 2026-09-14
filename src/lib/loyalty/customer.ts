/**
 * Loyalty Rewards — resolving the signed-in user to their per-business
 * `Customer` row.
 *
 * Points live on `Customer`, not `User`: the same person shopping at two
 * stores on the platform has two independent balances. A user who signed up
 * but never ordered has no `Customer` row at all, so every loyalty entry
 * point (join, redeem, view balance, save birthday) has to be able to create
 * one — the same problem `customer.addAddress` solves, and this mirrors its
 * upsert-by-`businessId_email` shape.
 */

import type { DbClient } from "~/server/db";
import { splitCustomerName } from "~/lib/customer-name";
import { isUniqueConstraintError } from "~/lib/prisma-errors";
import { normalizeEmail } from "~/lib/utils";

/** The loyalty-relevant slice of a `Customer` row. */
export type LoyaltyCustomer = {
  id: string;
  loyaltyPoints: number;
  loyaltyJoinedAt: Date | null;
  birthMonth: number | null;
  birthDay: number | null;
  email: string;
};

const LOYALTY_CUSTOMER_SELECT = {
  id: true,
  loyaltyPoints: true,
  loyaltyJoinedAt: true,
  birthMonth: true,
  birthDay: true,
  email: true,
} as const;

/**
 * The email's `Customer` row already belongs to a DIFFERENT signed-in user.
 * Typed so the router can map exactly this case to CONFLICT and let every
 * other failure (a Prisma error, a dropped connection) surface as a 500 that
 * Sentry actually captures.
 */
export class LoyaltyCustomerConflictError extends Error {
  constructor() {
    super("This email is already linked to another account.");
    this.name = "LoyaltyCustomerConflictError";
  }
}

/**
 * Finds or creates the `Customer` row for `user` at `businessId`, keyed on
 * the normalized email so a guest checkout as `Jane@x.com` and a sign-in as
 * `jane@x.com` resolve to one row (and one balance).
 *
 * `userId` is only ever written when the existing row has none — that is the
 * guest-order-linking seam: a guest checkout leaves a `Customer` with
 * `userId: null`, and the first authenticated loyalty action claims it.
 *
 * A row already claimed by a DIFFERENT user is a hard stop, not a silent
 * re-point: reassigning it would hand one person another person's points and
 * order history. Thrown as a plain `Error` so this module stays free of tRPC
 * imports; the router maps it to a `CONFLICT`. In practice it can only happen
 * if two platform users somehow share an email at the same store, which the
 * `@@unique([businessId, email])` constraint makes a genuine anomaly worth
 * surfacing rather than papering over.
 */
export async function ensureLoyaltyCustomer(
  db: DbClient,
  args: {
    businessId: string;
    user: { id: string; email: string; name?: string | null };
  },
): Promise<LoyaltyCustomer> {
  const email = normalizeEmail(args.user.email);
  const where = { businessId_email: { businessId: args.businessId, email } };

  const existing = await db.customer.findUnique({
    where,
    select: { ...LOYALTY_CUSTOMER_SELECT, userId: true },
  });

  if (existing) return claimExisting(db, existing, args.user.id);

  try {
    return await db.customer.create({
      data: {
        businessId: args.businessId,
        email,
        userId: args.user.id,
        // Stores NULL, not "", for a missing half — see splitCustomerName.
        ...splitCustomerName(args.user.name),
      },
      select: LOYALTY_CUSTOMER_SELECT,
    });
  } catch (error) {
    // Race: a concurrent request (a second tab, a double-clicked "Join
    // rewards") created the row between our read and this write. The unique
    // constraint is the arbiter; re-read and treat it as the existing-row
    // case rather than surfacing a 500 for a button pressed twice.
    if (!isUniqueConstraintError(error)) throw error;

    const raced = await db.customer.findUniqueOrThrow({
      where,
      select: { ...LOYALTY_CUSTOMER_SELECT, userId: true },
    });
    return claimExisting(db, raced, args.user.id);
  }
}

/** Attaches `userId` to an unclaimed row; refuses a row owned by someone else. */
async function claimExisting(
  db: DbClient,
  row: LoyaltyCustomer & { userId: string | null },
  userId: string,
): Promise<LoyaltyCustomer> {
  const { userId: ownerId, ...customer } = row;

  if (ownerId === null) {
    await db.customer.update({
      where: { id: customer.id },
      data: { userId },
    });
    return customer;
  }

  if (ownerId !== userId) {
    throw new LoyaltyCustomerConflictError();
  }

  return customer;
}
