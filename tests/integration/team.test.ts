import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

const reqHost = vi.hoisted(() => ({ value: "team-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `team.invite` sends the invitation over Resend. Mock the templates module so
// the test never hits the network, and keep the spy so we can assert on the
// invite URL it was handed.
const sendTeamInviteEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true }),
);
vi.mock("~/lib/email/templates", () => ({ sendTeamInviteEmail }));

describe("team router", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "team-biz.simplepress.test";
    sendTeamInviteEmail.mockClear();
  });

  it("blocks demoting the only owner", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const membership = await db.businessMembership.findFirstOrThrow({
      where: { businessId: business.id, userId: owner.id },
    });
    const caller = createTestCaller({ userId: owner.id });

    await expect(
      caller.team.changeRole({ membershipId: membership.id, role: "MANAGER" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const stillOwner = await db.businessMembership.findUniqueOrThrow({
      where: { id: membership.id },
    });
    expect(stillOwner.role).toBe("OWNER");
  });

  it("blocks removing the only owner", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const membership = await db.businessMembership.findFirstOrThrow({
      where: { businessId: business.id, userId: owner.id },
    });
    const caller = createTestCaller({ userId: owner.id });

    await expect(
      caller.team.remove({ membershipId: membership.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const stillExists = await db.businessMembership.findUnique({
      where: { id: membership.id },
    });
    expect(stillExists).not.toBeNull();
  });

  it("allows demoting an owner when a second owner remains", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const ownerA = await createOwnerUser(business.id);
    const userB = await createUser();
    const membershipB = await createMembership(business.id, userB.id, "OWNER");
    const caller = createTestCaller({ userId: ownerA.id });

    const updated = await caller.team.changeRole({
      membershipId: membershipB.id,
      role: "MANAGER",
    });
    expect(updated.role).toBe("MANAGER");

    const remainingOwners = await db.businessMembership.count({
      where: { businessId: business.id, role: "OWNER" },
    });
    expect(remainingOwners).toBe(1);
  });

  it("allows removing an owner when a second owner remains", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const ownerA = await createOwnerUser(business.id);
    const userB = await createUser();
    const membershipB = await createMembership(business.id, userB.id, "OWNER");
    const caller = createTestCaller({ userId: ownerA.id });

    await caller.team.remove({ membershipId: membershipB.id });

    const stillExists = await db.businessMembership.findUnique({
      where: { id: membershipB.id },
    });
    expect(stillExists).toBeNull();
  });

  it("cross-tenant guard: changeRole and remove targeting a membership in another business return NOT_FOUND", async () => {
    const businessA = await createBusiness({ subdomain: "team-biz" });
    const businessB = await createBusiness({ subdomain: "team-biz-b" });
    const ownerA = await createOwnerUser(businessA.id);
    const userB = await createUser();
    const membershipB = await createMembership(
      businessB.id,
      userB.id,
      "MANAGER",
    );

    reqHost.value = "team-biz.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    await expect(
      callerA.team.changeRole({ membershipId: membershipB.id, role: "OWNER" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      callerA.team.remove({ membershipId: membershipB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // membershipB must be completely untouched.
    const untouched = await db.businessMembership.findUniqueOrThrow({
      where: { id: membershipB.id },
    });
    expect(untouched.role).toBe("MANAGER");
  });

  it("invite links point at the business's own subdomain, not the platform domain", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });

    await caller.team.invite({ email: "newbie@test.dev", role: "MANAGER" });

    const { inviteUrl } = sendTeamInviteEmail.mock.calls[0]![0] as {
      inviteUrl: string;
    };
    expect(inviteUrl).toContain("team-biz.simplepress.test");
    // The bare platform domain must never be the landing host — sessions are
    // per-host, so signing in there would not authenticate on the store.
    expect(inviteUrl).not.toMatch(/^https:\/\/simplepress\.test\//);
  });

  it("invite links use an ACTIVE custom domain when the business has one", async () => {
    const business = await createBusiness({
      subdomain: "team-biz",
      customDomain: "pinkart.example",
    });
    await db.business.update({
      where: { id: business.id },
      data: { domainStatus: "ACTIVE" },
    });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });

    await caller.team.invite({ email: "newbie@test.dev", role: "STAFF" });

    const { inviteUrl } = sendTeamInviteEmail.mock.calls[0]![0] as {
      inviteUrl: string;
    };
    expect(inviteUrl).toMatch(
      /^https:\/\/pinkart\.example\/auth\/accept-invite/,
    );
  });

  it("revokeInvite marks the invite used so it drops out of the pending list", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });

    await caller.team.invite({ email: "newbie@test.dev", role: "MANAGER" });

    const before = await caller.team.list();
    expect(before.pendingInvites).toHaveLength(1);

    await caller.team.revokeInvite({ inviteId: before.pendingInvites[0]!.id });

    const after = await caller.team.list();
    expect(after.pendingInvites).toHaveLength(0);

    // Revoking must also invalidate the emailed link.
    const revoked = await db.teamInvite.findUniqueOrThrow({
      where: { id: before.pendingInvites[0]!.id },
    });
    expect(revoked.used).toBe(true);
    await expect(
      caller.team.getInvite({ code: revoked.code }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("revokeInvite frees the email so the same person can be re-invited", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });

    await caller.team.invite({ email: "newbie@test.dev", role: "MANAGER" });
    const { pendingInvites } = await caller.team.list();
    await caller.team.revokeInvite({ inviteId: pendingInvites[0]!.id });

    // The duplicate-active-invite guard must not block a re-invite.
    await expect(
      caller.team.invite({ email: "newbie@test.dev", role: "STAFF" }),
    ).resolves.toMatchObject({ role: "STAFF" });
  });

  it("cross-tenant guard: revokeInvite cannot touch another business's invite", async () => {
    const businessA = await createBusiness({ subdomain: "team-biz" });
    const businessB = await createBusiness({ subdomain: "team-biz-b" });
    const ownerA = await createOwnerUser(businessA.id);
    const inviteB = await db.teamInvite.create({
      data: {
        businessId: businessB.id,
        email: "elsewhere@test.dev",
        code: "cross-tenant-revoke-code",
        role: "MANAGER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const callerA = createTestCaller({ userId: ownerA.id });
    await expect(
      callerA.team.revokeInvite({ inviteId: inviteB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const untouched = await db.teamInvite.findUniqueOrThrow({
      where: { id: inviteB.id },
    });
    expect(untouched.used).toBe(false);
  });

  it("acceptInvite rejects when the invite email does not match the logged-in user's email", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const invite = await db.teamInvite.create({
      data: {
        businessId: business.id,
        email: "invited@test.dev",
        code: "test-invite-code-1",
        role: "MANAGER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    const otherUser = await createUser({ email: "someone-else@test.dev" });
    const caller = createTestCaller({
      userId: otherUser.id,
      email: otherUser.email,
    });

    await expect(
      caller.team.acceptInvite({ code: invite.code }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // No membership should have been created, and the invite stays unused.
    const membership = await db.businessMembership.findUnique({
      where: {
        userId_businessId: { userId: otherUser.id, businessId: business.id },
      },
    });
    expect(membership).toBeNull();
    const untouchedInvite = await db.teamInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(untouchedInvite.used).toBe(false);
  });

  it("acceptInvite succeeds and creates a membership when the email matches (case-insensitive)", async () => {
    const business = await createBusiness({ subdomain: "team-biz" });
    const invite = await db.teamInvite.create({
      data: {
        businessId: business.id,
        email: "Invited@Test.dev",
        code: "test-invite-code-2",
        role: "STAFF",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    const invitedUser = await createUser({ email: "invited@test.dev" });
    const caller = createTestCaller({
      userId: invitedUser.id,
      email: invitedUser.email,
    });

    const result = await caller.team.acceptInvite({ code: invite.code });
    expect(result.success).toBe(true);
    expect(result.businessId).toBe(business.id);

    const membership = await db.businessMembership.findUniqueOrThrow({
      where: {
        userId_businessId: { userId: invitedUser.id, businessId: business.id },
      },
    });
    expect(membership.role).toBe("STAFF");

    const usedInvite = await db.teamInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(usedInvite.used).toBe(true);
  });

  it("getInvite returns exactly businessName/email/role — never the raw invite row", async () => {
    // `getInvite` is a `publicProcedure` keyed on the invite code, so everything
    // it returns is readable by whoever holds that code.
    //
    // `email` IS expected here: AcceptInviteClient renders "Sign in or create an
    // account with <email>" and compares it against the session to warn when the
    // wrong account is signed in. The code was mailed to that address, so the
    // disclosure is acceptable — this test is not trying to remove it.
    //
    // What it guards is the projection WIDENING. `testimonial.getInvite` shipped
    // as `return invite` and handed out the invitee's email plus the row's
    // internals; this asserts the exact key set so the same refactor here fails
    // loudly. `code` is the one that matters most — leaking it would let a reader
    // accept someone else's invitation.
    const business = await createBusiness({ subdomain: "team-biz" });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });

    await caller.team.invite({
      email: "invitee@leaktest.dev",
      role: "MANAGER",
    });
    const { pendingInvites } = await caller.team.list();
    const created = await db.teamInvite.findUniqueOrThrow({
      where: { id: pendingInvites[0]!.id },
    });

    // Unauthenticated — the state a real invitee is in when they open the link.
    const anonCaller = createTestCaller({});
    const result = await anonCaller.team.getInvite({ code: created.code });

    expect(Object.keys(result).sort()).toEqual([
      "businessName",
      "email",
      "role",
    ]);
    expect(result.businessName).toBe(business.name);
    expect(result.email).toBe("invitee@leaktest.dev");
    // The invite code must never come back out of a code-keyed public lookup.
    expect(JSON.stringify(result)).not.toContain(created.code);
  });
});
