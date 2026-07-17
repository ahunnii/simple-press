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

describe("team router", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "team-biz.simplepress.test";
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
    const membershipB = await createMembership(businessB.id, userB.id, "MANAGER");

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
});
