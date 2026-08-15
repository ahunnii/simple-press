import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import {
  createBusiness,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * Rejection + positive-control coverage for the four base-procedure gates in
 * `src/server/api/trpc.ts` (`protectedProcedure`, `platformAdminProcedure`,
 * `featureGate`, `getBusinessProcedure`). Before this file none of them had a
 * single assertion proving they actually reject an unauthorized caller —
 * every other integration test only ever exercises the *allowed* path.
 *
 * Several of the gates under test (`getBusinessProcedure`, and the
 * independent `checkBusiness()` call inside `featureGate`) resolve the
 * tenant from the request host via `next/headers`, so mock it with a
 * mutable host — same idiom as tenant-isolation.test.ts / events.test.ts.
 */
const reqHost = vi.hoisted(() => ({ value: "gate-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

describe("procedure gate tiers (src/server/api/trpc.ts)", () => {
  beforeEach(resetDb);

  // ── protectedProcedure (~:126) ──────────────────────────────────────────
  // The most-used gate in the codebase (customer.*, account.*, review.*,
  // testimonials.*, team.acceptInvite, ...) had zero UNAUTHORIZED assertions
  // anywhere in the repo. `customer.getMyProfile` is a read-only, input-free
  // protectedProcedure — cheap positive control, and its resolver body also
  // happens to call `checkBusiness()`, so a null-session caller must be
  // rejected by the *middleware* before that ever runs.
  describe("protectedProcedure", () => {
    it("rejects a null-session caller with UNAUTHORIZED", async () => {
      const caller = createTestCaller({});

      await expect(caller.customer.getMyProfile()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("lets an authenticated caller reach the resolver", async () => {
      await createBusiness({ subdomain: "gate-a" });
      reqHost.value = "gate-a.simplepress.test";
      const user = await createUser();
      const caller = createTestCaller({ userId: user.id, email: user.email });

      // No Customer row exists for this user yet, so getMyProfile resolves
      // to null rather than throwing — the point here is that the call
      // reaches the resolver at all (no UNAUTHORIZED), not the payload.
      await expect(caller.customer.getMyProfile()).resolves.toBeNull();
    });
  });

  // ── platformAdminProcedure (~:313) ──────────────────────────────────────
  // Guards 18 procedures in platform.ts + 3 in editor-note.ts that mutate
  // users, businesses, domains, and memberships across every tenant. No test
  // has ever driven a PLATFORM_ADMIN caller through this gate, in either
  // direction. `getMaintenance` and `getDashboardStats` are read-only and
  // input-free — cheap, deterministic positive controls.
  describe("platformAdminProcedure", () => {
    it("rejects a null-session caller with UNAUTHORIZED", async () => {
      const caller = createTestCaller({});

      await expect(caller.platform.getMaintenance()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("rejects a BUSINESS_USER caller with FORBIDDEN", async () => {
      const user = await createUser({ platformRole: "BUSINESS_USER" });
      const caller = createTestCaller({
        userId: user.id,
        email: user.email,
        platformRole: "BUSINESS_USER",
      });

      await expect(caller.platform.getMaintenance()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.platform.getDashboardStats()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("lets a PLATFORM_ADMIN caller reach the resolver", async () => {
      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const caller = createTestCaller({
        userId: admin.id,
        email: admin.email,
        platformRole: "PLATFORM_ADMIN",
      });

      // Fresh DB (resetDb in beforeEach) means no PlatformConfig row exists,
      // so getMaintenance falls back to its documented defaults.
      await expect(caller.platform.getMaintenance()).resolves.toEqual({
        enabled: false,
        message: null,
      });

      const stats = await caller.platform.getDashboardStats();
      // The admin's own User row was just created, so the global count is
      // at least 1 — proves the query actually ran rather than short-circuiting.
      expect(stats.totalUsers).toBeGreaterThanOrEqual(1);
    });

    it("revokes PLATFORM_ADMIN access immediately when the DB role is demoted", async () => {
      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const caller = createTestCaller({
        userId: admin.id,
        email: admin.email,
        // Cookie cache still claims PLATFORM_ADMIN — the live DB row must win.
        platformRole: "PLATFORM_ADMIN",
      });

      await expect(caller.platform.getMaintenance()).resolves.toBeTruthy();

      const { db } = await import("../helpers/db");
      await db.user.update({
        where: { id: admin.id },
        data: { platformRole: "BUSINESS_USER" },
      });

      await expect(caller.platform.getMaintenance()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  // ── featureGate(key) (~:334) ────────────────────────────────────────────
  // Applied ~60 times across routers. Existing tests that touch featureGate
  // always enable the flag on `ownerAdminProcedure`-guarded admin routes
  // before calling them; none proves the *admin* chain (as opposed to the
  // public `getBusinessProcedure` chain) actually rejects when the flag is
  // off. `events.getAll` is a read-only, input-free `ownerAdminProcedure`
  // wrapped in `featureGate("events")`; `events` is `enabledByDefault: false`
  // in the feature registry, so a freshly-created business has it off by
  // default.
  describe("featureGate", () => {
    it("rejects with FORBIDDEN when the business has not enabled the feature", async () => {
      const business = await createBusiness({ subdomain: "gate-fg-off" });
      reqHost.value = "gate-fg-off.simplepress.test";
      const owner = await createOwnerUser(business.id);
      const caller = createTestCaller({
        userId: owner.id,
        email: owner.email,
      });

      await expect(caller.events.getAll()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("lets the call through once the business enables the feature", async () => {
      const business = await createBusiness({
        subdomain: "gate-fg-on",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-fg-on.simplepress.test";
      const owner = await createOwnerUser(business.id);
      const caller = createTestCaller({
        userId: owner.id,
        email: owner.email,
      });

      await expect(caller.events.getAll()).resolves.toEqual([]);
    });
  });

  // ── suspended-store remediation (ownerAdminProcedure + featureGate) ──────
  // Platform admins suspend a store to fix a policy violation, then work on
  // it through the tenant host. Both the tier gate and featureGate resolve
  // the tenant independently, so both must apply the platform-admin
  // carve-out — a regression in either one turns the admin's whole
  // remediation session into 404s.
  describe("suspended store — platform admin remediation", () => {
    it("locks the store's own OWNER out with NOT_FOUND while suspended", async () => {
      const business = await createBusiness({
        subdomain: "gate-susp-owner",
        status: "suspended",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-susp-owner.simplepress.test";
      const owner = await createOwnerUser(business.id);
      const caller = createTestCaller({
        userId: owner.id,
        email: owner.email,
      });

      await expect(caller.events.getAll()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("lets a PLATFORM_ADMIN reach an ownerAdminProcedure + featureGate chain on a suspended store", async () => {
      await createBusiness({
        subdomain: "gate-susp-fix",
        status: "suspended",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-susp-fix.simplepress.test";
      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const caller = createTestCaller({
        userId: admin.id,
        email: admin.email,
        platformRole: "PLATFORM_ADMIN",
      });

      await expect(caller.events.getAll()).resolves.toEqual([]);
    });
  });

  // ── getBusinessProcedure() (~:351) ──────────────────────────────────────
  // Tenant resolver for public storefront procedures. An unresolvable host
  // (no Business matches by subdomain or custom domain) must surface as a
  // clean 404, not an unclassified 500 — see the comment on
  // `getBusinessFlags()` about exactly this failure mode.
  // `events.getUpcomingPublic` chains `getBusinessProcedure()` directly
  // ahead of `featureGate`, so asserting NOT_FOUND here (rather than
  // FORBIDDEN) proves the business lookup itself is what's firing — the
  // feature flag check never even runs for an unresolvable host.
  describe("getBusinessProcedure", () => {
    it("returns NOT_FOUND when the request host resolves to no business", async () => {
      reqHost.value = "no-such-business.simplepress.test";
      const caller = createTestCaller({});

      await expect(caller.events.getUpcomingPublic()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("returns NOT_FOUND when the business exists but is suspended", async () => {
      await createBusiness({
        subdomain: "gate-suspended",
        status: "suspended",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-suspended.simplepress.test";
      const caller = createTestCaller({});

      await expect(caller.events.getUpcomingPublic()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("lets a PLATFORM_ADMIN through to a suspended business", async () => {
      // Remediation workflow: an admin suspends a store over a policy
      // violation, then browses the tenant host to fix it. The suspended
      // store must stay reachable for them — and ONLY them (the anonymous
      // NOT_FOUND above is the control for everyone else).
      await createBusiness({
        subdomain: "gate-suspended-admin",
        status: "suspended",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-suspended-admin.simplepress.test";
      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const caller = createTestCaller({
        userId: admin.id,
        email: admin.email,
        platformRole: "PLATFORM_ADMIN",
      });

      await expect(caller.events.getUpcomingPublic()).resolves.toEqual([]);
    });

    it("lets the call through once the host resolves to a business", async () => {
      await createBusiness({
        subdomain: "gate-gbp",
        featureFlags: { events: true },
      });
      reqHost.value = "gate-gbp.simplepress.test";
      const caller = createTestCaller({});

      await expect(caller.events.getUpcomingPublic()).resolves.toEqual([]);
    });
  });
});
