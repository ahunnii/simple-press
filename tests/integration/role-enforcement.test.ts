import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCollection,
  createDiscount,
  createMembership,
  createOrder,
  createOwnerUser,
  createPage,
  createUser,
} from "../helpers/factories";

/**
 * Role-tier enforcement.
 *
 * Every other integration test in this suite calls as an OWNER, so nothing
 * anywhere proves that the three admin tiers in `~/server/api/trpc` are
 * actually different from each other. The boundary is enforced purely by which
 * procedure builder a developer imported, which means a one-line regression —
 * `membership?.role !== "OWNER"` widened to
 * `!["OWNER","MANAGER"].includes(...)` in `ownerOnlyProcedure` — would promote
 * every manager on the platform to owner with a completely green suite.
 *
 * The three tiers, and the exact error each throws:
 *
 * | procedure              | allows                 | rejection                              |
 * | ---------------------- | ---------------------- | -------------------------------------- |
 * | `ownerOnlyProcedure`   | OWNER                  | FORBIDDEN "Owner access required"      |
 * | `ownerAdminProcedure`  | OWNER, MANAGER         | FORBIDDEN "Not a business member"      |
 * | `staffProcedure`       | OWNER, MANAGER, STAFF  | FORBIDDEN "Not a business member"      |
 *
 * All three throw UNAUTHORIZED (not FORBIDDEN) for a null session, and all
 * three bypass the membership check entirely for `platformRole:
 * "PLATFORM_ADMIN"`.
 *
 * Two things make these tests worth more than the error code alone:
 *
 * 1. Every rejection is paired with a **positive control** in the same test —
 *    the allowed role making the identical call and succeeding. Without that, a
 *    procedure that was simply broken (bad input schema, missing feature flag,
 *    unresolvable host) would pass the rejection assertion for entirely the
 *    wrong reason.
 * 2. The rejection asserts the **message** as well as the code. `FORBIDDEN` is
 *    also what `featureGate` throws, and "Owner access required" vs "Not a
 *    business member" is the only thing that distinguishes an owner-only
 *    rejection from an ordinary non-member one.
 *
 * A note on timeouts: `timingMiddleware` adds a random 100–500ms artificial
 * delay to every procedure call whenever `isDev` is true, which includes
 * NODE_ENV=test. Tests making three or more calls carry an explicit timeout so
 * they can't flake against Vitest's 5s default on a slow machine.
 */

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "roles-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `order.refund` talks to Stripe directly and `business.updateStripeSettings`
// reads Stripe Tax settings. Mock the client so no real network call is ever
// made — and so "Stripe was never reached" becomes an assertable fact, which is
// a much stronger claim about a rejected refund than the error code alone.
const stripeMocks = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  chargesRetrieve: vi.fn(),
  taxSettingsRetrieve: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    refunds: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.refundsCreate(...args),
    },
    charges: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.chargesRetrieve(...args),
    },
    tax: {
      settings: {
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.taxSettingsRetrieve(...args),
      },
    },
  },
}));

// The team + order routers send transactional email via Resend. Mock the whole
// templates module so nothing here hits the network; `sendTeamInviteEmail` is
// kept as a spy so a rejected invite can be shown to have queued nothing.
const sendTeamInviteEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true }),
);
vi.mock("~/lib/email/templates", () => ({
  sendTeamInviteEmail,
  sendOrderCancelled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendOrderFulfilled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderReadyForPickup: vi.fn().mockResolvedValue({ success: true }),
  sendOrderRefunded: vi.fn().mockResolvedValue({ success: true }),
  sendOrderShipped: vi.fn().mockResolvedValue({ success: true }),
}));

/** What `ownerOnlyProcedure` throws for a MANAGER or STAFF caller. */
const OWNER_ONLY_REJECTION = {
  code: "FORBIDDEN",
  message: "Owner access required",
} as const;

/**
 * What `ownerAdminProcedure` and `staffProcedure` throw for a caller whose role
 * isn't in their allow-list. The wording is a little misleading for a STAFF
 * member who *is* a business member and is being turned away on role alone —
 * it is asserted here as-is so a change to it is a deliberate decision rather
 * than an accident.
 */
const NOT_A_MEMBER_REJECTION = {
  code: "FORBIDDEN",
  message: "Not a business member",
} as const;

/**
 * Assert a call rejected with a specific tRPC error.
 *
 * Checks the thrown value is a real `TRPCError` (not some other failure that
 * happens to carry a `code`), then the code and — critically — the message. See
 * the file docblock for why the message is load-bearing here.
 */
async function expectRejection(
  call: Promise<unknown>,
  expected: { code: string; message?: string },
): Promise<void> {
  await expect(call).rejects.toThrow(TRPCError);
  await expect(call).rejects.toMatchObject(expected);
}

describe("role enforcement across the admin procedure tiers", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "roles-biz.simplepress.test";
    sendTeamInviteEmail.mockClear();
    stripeMocks.refundsCreate.mockReset();
    stripeMocks.chargesRetrieve.mockReset();
    stripeMocks.taxSettingsRetrieve.mockReset();

    // Same defaults order-refund.test.ts uses: the refund echoes the requested
    // amount back and the charge read-back reports nothing refunded yet.
    stripeMocks.refundsCreate.mockImplementation(
      async (params: { amount: number }) => ({
        id: "re_test",
        amount: params.amount,
        status: "succeeded",
        charge: "ch_test",
      }),
    );
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 0 });
  });

  /**
   * One business with all three membership roles on it, plus a caller for each.
   *
   * `featureFlags` matters more than it looks: `collections` and `coupons` are
   * `enabledByDefault: false` in the registry, and both bulk-delete procedures
   * sit behind a `featureGate`. Without the override the OWNER positive control
   * would fail with FORBIDDEN too — for the wrong reason — and the test would
   * "pass" while proving nothing about roles at all.
   */
  async function setupBusiness(featureFlags?: Record<string, boolean>) {
    const business = await createBusiness({
      subdomain: "roles-biz",
      ...(featureFlags ? { featureFlags } : {}),
    });
    const owner = await createOwnerUser(business.id);
    const managerUser = await createUser({ name: "Test Manager" });
    const managerMembership = await createMembership(
      business.id,
      managerUser.id,
      "MANAGER",
    );
    const staffUser = await createUser({ name: "Test Staff" });
    const staffMembership = await createMembership(
      business.id,
      staffUser.id,
      "STAFF",
    );

    return {
      business,
      owner,
      managerUser,
      managerMembership,
      staffUser,
      staffMembership,
      ownerCaller: createTestCaller({ userId: owner.id }),
      managerCaller: createTestCaller({ userId: managerUser.id }),
      staffCaller: createTestCaller({ userId: staffUser.id }),
    };
  }

  // ── baseline ──────────────────────────────────────────────────────────────

  it("baseline: a MANAGER caller is accepted by ownerAdminProcedure", async () => {
    // Establishes that the manager caller, host resolution, and membership
    // lookup all work. Every FORBIDDEN in the owner-only block below is
    // therefore attributable to the *tier*, not to a broken caller — without
    // this, a manager caller that could do nothing at all would sail through
    // every rejection assertion in this file.
    const { managerCaller } = await setupBusiness();

    const result = await managerCaller.team.list();
    expect(result.memberships).toHaveLength(3);
  });

  it("baseline: a STAFF caller is accepted by staffProcedure", async () => {
    // The mirror of the above for the STAFF tier: proves the staff caller is
    // functional before the ownerAdmin block asserts it is turned away from
    // refunds and settings.
    const { business, staffCaller } = await setupBusiness();
    const order = await createOrder(business.id);

    const result = await staffCaller.order.getAll({});
    expect(result.orders.map((o) => o.id)).toEqual([order.id]);
  });

  // ── ownerOnlyProcedure: MANAGER must be rejected ──────────────────────────

  it("team.invite is OWNER-only — a MANAGER cannot mint an invitation", async () => {
    // A manager who can invite can invite *themselves* a second account at
    // OWNER role and walk straight through the owner-only tier. This is the
    // shortest privilege-escalation path in the product.
    const { business, managerCaller, ownerCaller } = await setupBusiness();

    await expectRejection(
      managerCaller.team.invite({ email: "newbie@test.dev", role: "OWNER" }),
      OWNER_ONLY_REJECTION,
    );

    // The rejection is in middleware, before the handler — so no invite row
    // exists and no email was queued to the address either.
    const inviteCount = await db.teamInvite.count({
      where: { businessId: business.id },
    });
    expect(inviteCount).toBe(0);
    expect(sendTeamInviteEmail).not.toHaveBeenCalled();

    // Positive control: byte-for-byte the same call from the OWNER succeeds.
    const invite = await ownerCaller.team.invite({
      email: "newbie@test.dev",
      role: "OWNER",
    });
    expect(invite.email).toBe("newbie@test.dev");
    expect(invite.role).toBe("OWNER");
  });

  it("team.changeRole is OWNER-only — a MANAGER cannot promote themselves to OWNER", async () => {
    // The single most dangerous call in the router: a manager editing their own
    // membership row to OWNER is outright privilege escalation, and the
    // last-owner guard inside the handler does nothing to stop a *promotion*.
    const { managerCaller, managerMembership, ownerCaller, staffMembership } =
      await setupBusiness();

    await expectRejection(
      managerCaller.team.changeRole({
        membershipId: managerMembership.id,
        role: "OWNER",
      }),
      OWNER_ONLY_REJECTION,
    );

    const unchanged = await db.businessMembership.findUniqueOrThrow({
      where: { id: managerMembership.id },
    });
    expect(unchanged.role).toBe("MANAGER");

    // Positive control: role changes still work — for the OWNER.
    const promoted = await ownerCaller.team.changeRole({
      membershipId: staffMembership.id,
      role: "MANAGER",
    });
    expect(promoted.role).toBe("MANAGER");
  });

  it("team.remove is OWNER-only — a MANAGER cannot evict another member", async () => {
    // Removal is how a store gets taken over: a manager who can remove
    // memberships can remove the owner's. The handler's last-owner guard is the
    // second line of defence; the tier is the first, and it is the one that
    // stops a manager from thinning out the team at all.
    const { managerCaller, ownerCaller, staffMembership } =
      await setupBusiness();

    await expectRejection(
      managerCaller.team.remove({ membershipId: staffMembership.id }),
      OWNER_ONLY_REJECTION,
    );

    const stillThere = await db.businessMembership.findUnique({
      where: { id: staffMembership.id },
    });
    expect(stillThere).not.toBeNull();

    // Positive control: the OWNER can remove the same membership.
    await ownerCaller.team.remove({ membershipId: staffMembership.id });
    const removed = await db.businessMembership.findUnique({
      where: { id: staffMembership.id },
    });
    expect(removed).toBeNull();
  });

  it("team.revokeInvite is OWNER-only — a MANAGER cannot cancel a pending invitation", async () => {
    // The quiet one. Revocation is how an owner un-sends an invite they regret;
    // a manager able to revoke could silently kill the owner's incoming
    // co-owner invite and keep themselves the most senior active account.
    const { business, managerCaller, ownerCaller } = await setupBusiness();
    const invite = await db.teamInvite.create({
      data: {
        businessId: business.id,
        email: "pending@test.dev",
        code: "role-enforcement-invite-code",
        role: "OWNER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await expectRejection(
      managerCaller.team.revokeInvite({ inviteId: invite.id }),
      OWNER_ONLY_REJECTION,
    );

    const untouched = await db.teamInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(untouched.used).toBe(false);

    // Positive control: the OWNER can revoke it.
    const revoked = await ownerCaller.team.revokeInvite({
      inviteId: invite.id,
    });
    expect(revoked.used).toBe(true);
  });

  it("collections.bulkDelete is OWNER-only, while the reversible bulkSetPublished next door is not", async () => {
    // Blast radius, not distrust (see the router's own comment): a manager may
    // publish/unpublish all day because it is one click to undo, but an
    // escalated "select all N matching" delete is unrecoverable without a
    // database restore. This test pins BOTH halves of that split — the
    // rejection is only meaningful alongside proof that the manager is
    // otherwise free to operate on the very same rows.
    const { business, managerCaller, ownerCaller } = await setupBusiness({
      collections: true,
    });
    const collection = await createCollection(business.id, {
      published: true,
    });

    await expectRejection(
      managerCaller.collections.bulkDelete({ ids: [collection.id] }),
      OWNER_ONLY_REJECTION,
    );
    const survived = await db.collection.findUnique({
      where: { id: collection.id },
    });
    expect(survived).not.toBeNull();

    // The manager IS allowed the reversible sibling on the same row.
    const published = await managerCaller.collections.bulkSetPublished({
      ids: [collection.id],
      published: false,
    });
    expect(published.count).toBe(1);

    // Positive control: the OWNER can delete.
    const deleted = await ownerCaller.collections.bulkDelete({
      ids: [collection.id],
    });
    expect(deleted.count).toBe(1);
    const gone = await db.collection.findUnique({
      where: { id: collection.id },
    });
    expect(gone).toBeNull();
  }, 15_000);

  it("discount.bulkDelete is OWNER-only — a MANAGER cannot mass-delete discount codes", async () => {
    // Same blast-radius rule as collections. Past orders keep their own record
    // of what was applied (`Order.discountCode` is `onDelete: SetNull`), so the
    // damage here is to the live promo set rather than to order history — but
    // an irreversible bulk delete stays owner-only per the platform standard.
    const { business, managerCaller, ownerCaller } = await setupBusiness({
      coupons: true,
    });
    const discount = await createDiscount(business.id, { code: "ROLETEST" });

    await expectRejection(
      managerCaller.discount.bulkDelete({ ids: [discount.id] }),
      OWNER_ONLY_REJECTION,
    );
    const survived = await db.discountCode.findUnique({
      where: { id: discount.id },
    });
    expect(survived).not.toBeNull();

    // Positive control: the OWNER can delete.
    const deleted = await ownerCaller.discount.bulkDelete({
      ids: [discount.id],
    });
    expect(deleted.count).toBe(1);
  });

  it("content.bulkDelete is OWNER-only — a MANAGER cannot mass-delete pages", async () => {
    // Every deleted page takes its storefront URL down immediately and there is
    // no undo. A manager can unpublish (reversible); deleting is the owner's.
    const { business, managerCaller, ownerCaller } = await setupBusiness();
    const page = await createPage(business.id, { title: "Role Test Page" });

    await expectRejection(
      managerCaller.content.bulkDelete({ ids: [page.id] }),
      OWNER_ONLY_REJECTION,
    );
    const survived = await db.page.findUnique({ where: { id: page.id } });
    expect(survived).not.toBeNull();

    // Positive control: the OWNER can delete.
    const deleted = await ownerCaller.content.bulkDelete({ ids: [page.id] });
    expect(deleted.count).toBe(1);
    const gone = await db.page.findUnique({ where: { id: page.id } });
    expect(gone).toBeNull();
  });

  // ── ownerAdminProcedure: STAFF must be rejected ───────────────────────────

  it("order.refund is closed to STAFF — and the rejection lands before Stripe is ever called", async () => {
    // `staffProcedure`'s docblock draws the line at "anything touching money,
    // prices, refunds, products, or settings must stay on ownerAdminProcedure".
    // A refund is real money leaving the merchant's balance, initiated by a
    // fulfillment-only worker. "Stripe was never reached" is the assertion that
    // matters: an error code alone would still be satisfied by a procedure that
    // moved the money and *then* failed.
    const { business, staffCaller, managerCaller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      status: "open",
      paymentStatus: "paid",
    });

    await expectRejection(
      staffCaller.order.refund({
        orderId: order.id,
        amount: 10000,
        restockItems: false,
        sendEmail: false,
      }),
      NOT_A_MEMBER_REJECTION,
    );
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();

    const untouched = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(untouched.refundAmountCents).toBeNull();
    expect(untouched.paymentStatus).toBe("paid");

    // Positive control: a MANAGER is on the allowed side of this tier, so the
    // boundary being pinned is exactly STAFF-vs-MANAGER and not "owner only".
    // (The refund arithmetic itself is covered in order-refund.test.ts.)
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 10000 });
    const result = await managerCaller.order.refund({
      orderId: order.id,
      amount: 10000,
      restockItems: false,
      sendEmail: false,
    });
    expect(result.order.refundAmountCents).toBe(10000);
    expect(stripeMocks.refundsCreate).toHaveBeenCalledTimes(1);
  });

  it("order.updatePaymentStatus is closed to STAFF — marking an order paid is a money write", async () => {
    // No Stripe call is involved, which is exactly why it is dangerous: this
    // rewrites the payment state the Finances page and the INFORM Act
    // thresholds are computed from. A fulfillment worker able to flip an unpaid
    // order to "paid" can ship goods that were never paid for and leave no
    // payment-processor trace of it.
    const { business, staffCaller, ownerCaller } = await setupBusiness();
    const order = await createOrder(business.id, {
      status: "open",
      paymentStatus: "pending",
    });

    await expectRejection(
      staffCaller.order.updatePaymentStatus({
        orderId: order.id,
        paymentStatus: "paid",
      }),
      NOT_A_MEMBER_REJECTION,
    );
    const untouched = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(untouched.paymentStatus).toBe("pending");

    // Positive control: the OWNER can make the same write.
    const updated = await ownerCaller.order.updatePaymentStatus({
      orderId: order.id,
      paymentStatus: "paid",
    });
    expect(updated.paymentStatus).toBe("paid");
  });

  it("business.updateStripeSettings is closed to STAFF — tax configuration is a settings write", async () => {
    // "Settings" in the staffProcedure docblock, and specifically the setting
    // that decides whether `automatic_tax` rides along on every checkout
    // session. A staff member toggling it off silently stops sales tax being
    // collected on every subsequent order — a liability the merchant then owes
    // out of pocket.
    const { business, staffCaller, managerCaller } = await setupBusiness();
    await db.business.update({
      where: { id: business.id },
      data: { stripeAutoTaxEnabled: true },
    });

    await expectRejection(
      staffCaller.business.updateStripeSettings({
        stripeAutoTaxEnabled: false,
      }),
      NOT_A_MEMBER_REJECTION,
    );
    const untouched = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    expect(untouched.stripeAutoTaxEnabled).toBe(true);

    // Positive control: a MANAGER may change it. Disabling skips the Stripe Tax
    // verification branch entirely, so this asserts pure authorization — the
    // Stripe client must stay untouched on both calls.
    const result = await managerCaller.business.updateStripeSettings({
      stripeAutoTaxEnabled: false,
    });
    expect(result.success).toBe(true);
    const updated = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    expect(updated.stripeAutoTaxEnabled).toBe(false);
    expect(stripeMocks.taxSettingsRetrieve).not.toHaveBeenCalled();
  });

  // ── staffProcedure: STAFF allowed, non-members rejected ───────────────────

  it("staffProcedure lets a STAFF member record a fulfillment — the role's whole purpose", async () => {
    // The counterweight to the block above. STAFF must be genuinely useful for
    // fulfillment, otherwise the safe "fix" for any of the refund/settings
    // rejections is to widen ownerAdminProcedure rather than to leave STAFF
    // where it belongs. If this ever fails, the role has been narrowed into
    // uselessness and the money boundary is under pressure again.
    const { business, staffCaller } = await setupBusiness();
    const order = await createOrder(business.id, {
      status: "open",
      paymentStatus: "paid",
      items: [{ quantity: 2, price: 1000, total: 2000 }],
    });

    const updated = await staffCaller.order.markAsFulfilled({
      orderId: order.id,
      shipments: [
        { carrier: "usps", trackingNumber: "9400100000000000000000" },
      ],
    });

    expect(updated.fulfillmentStatus).toBe("fulfilled");
    expect(updated.shipments).toHaveLength(1);
  });

  it("staffProcedure rejects a signed-in user with no membership anywhere", async () => {
    // tenant-isolation.test.ts already covers the cross-tenant shape of this
    // (an OWNER of business B calling `order.getAll` on business A's host), so
    // this covers the other realistic case on a different procedure: a
    // storefront shopper who has an account but no membership at all, calling
    // an admin fulfillment mutation directly. A mutation is used deliberately —
    // it lets the test assert nothing was written, not just that a read failed.
    const { business } = await setupBusiness();
    const shopper = await createUser({ email: "shopper@test.dev" });
    const order = await createOrder(business.id, {
      status: "open",
      paymentStatus: "paid",
      items: [{ quantity: 1, price: 1000, total: 1000 }],
    });
    const shopperCaller = createTestCaller({
      userId: shopper.id,
      email: shopper.email,
    });

    await expectRejection(
      shopperCaller.order.markAsFulfilled({
        orderId: order.id,
        shipments: [{ carrier: "usps", trackingNumber: "hacked" }],
      }),
      NOT_A_MEMBER_REJECTION,
    );

    const shipments = await db.orderShipment.findMany({
      where: { orderId: order.id },
    });
    expect(shipments).toHaveLength(0);
    const untouched = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(untouched.fulfillmentStatus).toBe("unfulfilled");
  });

  // ── session + platform-admin edges ────────────────────────────────────────

  it("every tier answers a null session with UNAUTHORIZED, not FORBIDDEN", async () => {
    // The distinction is not cosmetic: UNAUTHORIZED is what tells the client
    // to send the visitor to sign in, and all three tiers check the session
    // before they resolve the host or read a membership. A tier that fell
    // through to FORBIDDEN here would strand a logged-out owner on a
    // permission error instead of a login page.
    await setupBusiness();
    const anonymous = createTestCaller({});

    await expectRejection(
      anonymous.team.invite({ email: "x@test.dev", role: "STAFF" }),
      { code: "UNAUTHORIZED" },
    );
    await expectRejection(
      anonymous.order.updatePaymentStatus({
        orderId: "nonexistent",
        paymentStatus: "paid",
      }),
      { code: "UNAUTHORIZED" },
    );
    await expectRejection(anonymous.order.getAll({}), {
      code: "UNAUTHORIZED",
    });
  }, 15_000);

  it("PLATFORM_ADMIN bypasses the membership check on ownerOnlyProcedure", async () => {
    // A deliberate branch in all three tiers, pinned here so it is a decision
    // rather than an accident — and because it is the reason every FORBIDDEN
    // assertion above depends on the caller's platformRole staying
    // BUSINESS_USER. If the bypass ever widened to read the session's
    // platformRole loosely, those rejections would quietly stop being about
    // membership role at all.
    const { business } = await setupBusiness();
    const platformAdmin = await createUser({
      email: "platform-admin@test.dev",
      platformRole: "PLATFORM_ADMIN",
    });
    // Note: no BusinessMembership row is created for this user.
    const adminCaller = createTestCaller({
      userId: platformAdmin.id,
      email: platformAdmin.email,
      platformRole: "PLATFORM_ADMIN",
    });

    const invite = await adminCaller.team.invite({
      email: "support-escalation@test.dev",
      role: "MANAGER",
    });
    expect(invite.businessId).toBe(business.id);

    const membership = await db.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: platformAdmin.id,
          businessId: business.id,
        },
      },
    });
    expect(membership).toBeNull();
  });
});
