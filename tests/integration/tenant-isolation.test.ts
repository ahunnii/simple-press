import { beforeEach, describe, expect, it, vi } from "vitest";

// Procedures resolve the tenant from the request host via `next/headers`. Mock it
// with a mutable host so we can act as different tenants in one process.
const reqHost = vi.hoisted(() => ({ value: "tenant-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import {
  createBusiness,
  createOrder,
  createOwnerUser,
} from "../helpers/factories";

describe("multi-tenant isolation", () => {
  beforeEach(resetDb);

  it("scopes order reads to the caller's own business", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);

    const orderA = await createOrder(businessA.id, {
      customerEmail: "a@test.dev",
    });
    const orderB = await createOrder(businessB.id, {
      customerEmail: "b@test.dev",
    });

    // Act as tenant A's owner.
    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    // A's own order is visible.
    const ownOrder = await callerA.order.getById(orderA.id);
    expect(ownOrder?.id).toBe(orderA.id);

    // B's order is invisible to A even with a valid id — businessId scoping.
    const foreignOrder = await callerA.order.getById(orderB.id);
    expect(foreignOrder).toBeNull();

    // Listing returns only A's orders, never B's.
    const all = await callerA.order.getAll({});
    expect(all.map((o) => o.id)).toEqual([orderA.id]);
  });

  it("blocks a user who is not a member of the resolved business", async () => {
    // Business A must exist so the host resolves; the test acts as B's owner.
    await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerB = await createOwnerUser(businessB.id);

    reqHost.value = "tenant-a.simplepress.test";
    const caller = createTestCaller({ userId: ownerB.id });

    await expect(caller.order.getAll({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
