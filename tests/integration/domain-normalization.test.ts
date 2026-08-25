import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createBusiness, createOwnerUser } from "../helpers/factories";

/**
 * `domain.add` (src/server/api/routers/domain.ts) computes a lowercased
 * `normalizedDomain` but historically only used it for the platform-reserved
 * check — the duplicate lookup and the persisted `customDomain` both used the
 * raw, un-normalized input. Since the storefront host resolver does an exact
 * (already-lowercased) match against the incoming Host header, a mixed-case
 * stored domain would 404 the whole store, and two tenants could each claim
 * a different-case spelling of the same domain. This file pins the fix:
 * storage is always lowercased, and the duplicate check is case-insensitive.
 *
 * `ownerAdminProcedure` resolves the acting tenant from the request host via
 * `next/headers` — same hoisted-mock idiom as tenant-isolation.test.ts /
 * cross-tenant-mutation.test.ts.
 */
const reqHost = vi.hoisted(() => ({ value: "domain-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `domain.add` best-effort notifies Discord on success — mock it out so the
// test never makes a real network call (mirrors the email-module mocking
// pattern in cross-tenant-mutation.test.ts).
vi.mock("~/lib/discord/notification", () => ({
  notifyDiscordNewDomain: vi.fn().mockResolvedValue(undefined),
  notifyDiscordDomainRemoved: vi.fn().mockResolvedValue(undefined),
}));

describe("domain.add case normalization", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stores a mixed-case domain lowercased", async () => {
    const business = await createBusiness({ subdomain: "domain-a" });
    const owner = await createOwnerUser(business.id);
    reqHost.value = "domain-a.simplepress.test";
    const caller = createTestCaller({ userId: owner.id, email: owner.email });

    const result = await caller.domain.add("Example-Store.COM");

    expect(result.domain).toBe("example-store.com");

    const businessAfter = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    expect(businessAfter.customDomain).toBe("example-store.com");
    expect(businessAfter.domainStatus).toBe("PENDING_DNS");
  });

  it("rejects a case-variant duplicate of another business's domain", async () => {
    // Business B already owns the lowercase spelling.
    await createBusiness({
      subdomain: "domain-b",
      customDomain: "shop.example.com",
    });

    const businessA = await createBusiness({ subdomain: "domain-a2" });
    const ownerA = await createOwnerUser(businessA.id);
    reqHost.value = "domain-a2.simplepress.test";
    const callerA = createTestCaller({
      userId: ownerA.id,
      email: ownerA.email,
    });

    await expect(callerA.domain.add("SHOP.EXAMPLE.COM")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This domain is already in use",
    });

    const businessAAfter = await db.business.findUniqueOrThrow({
      where: { id: businessA.id },
    });
    expect(businessAAfter.customDomain).toBeNull();
  });
});
