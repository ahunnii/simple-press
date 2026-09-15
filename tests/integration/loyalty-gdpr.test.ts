import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createOwnerUser,
} from "../helpers/factories";
import { createTestCaller } from "../helpers/caller";

// customer.exportMyData / customer.anonymize both resolve the tenant from the
// request host via `next/headers` — mock it the same way tenant-isolation
// tests do.
const reqHost = vi.hoisted(() => ({ value: "gdpr-store.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

describe("loyalty points are GDPR/CCPA aware", () => {
  beforeEach(resetDb);

  it("exportMyData includes the loyalty balance, birthday and ledger history", async () => {
    const business = await createBusiness({ subdomain: "gdpr-store" });
    const shopper = await createOwnerUser(business.id, {
      email: "shopper@test.dev",
      role: "OWNER",
    });
    const customer = await createCustomer(business.id, {
      email: "shopper@test.dev",
      userId: shopper.id,
    });
    await db.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: 120, birthMonth: 7, birthDay: 4 },
    });
    await db.loyaltyLedger.createMany({
      data: [
        {
          businessId: business.id,
          customerId: customer.id,
          type: "adjust",
          points: 100,
          balanceAfter: 100,
          sourceKey: "adjust:seed-1",
          reason: "Welcome bonus",
        },
        {
          businessId: business.id,
          customerId: customer.id,
          type: "adjust",
          points: 20,
          balanceAfter: 120,
          sourceKey: "adjust:seed-2",
          reason: "Manual top-up",
        },
      ],
    });

    reqHost.value = "gdpr-store.simplepress.test";
    const caller = createTestCaller({
      userId: shopper.id,
      email: "shopper@test.dev",
    });

    const result = await caller.customer.exportMyData();

    expect(result?.loyalty.balance).toBe(120);
    expect(result?.loyalty.birthday).toEqual({ month: 7, day: 4 });
    expect(result?.loyalty.ledger).toHaveLength(2);
    expect(result?.loyalty.ledger.every((row) => row.code === null)).toBe(
      true,
    );
  });

  it("anonymize zeroes the loyalty balance/birthday and appends one clawback ledger row, and is safe to re-run", async () => {
    const business = await createBusiness({ subdomain: "gdpr-store-2" });
    const owner = await createOwnerUser(business.id);
    const customer = await createCustomer(business.id);
    await db.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: 120, birthMonth: 7, birthDay: 4 },
    });

    reqHost.value = "gdpr-store-2.simplepress.test";
    const caller = createTestCaller({ userId: owner.id });

    await caller.customer.anonymize({ id: customer.id });

    const afterFirst = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(afterFirst.loyaltyPoints).toBe(0);
    expect(afterFirst.birthMonth).toBeNull();
    expect(afterFirst.birthDay).toBeNull();
    expect(afterFirst.anonymizedAt).not.toBeNull();

    const clawbackRows = await db.loyaltyLedger.findMany({
      where: { customerId: customer.id, sourceKey: `anonymize:${customer.id}` },
    });
    expect(clawbackRows).toHaveLength(1);
    expect(clawbackRows[0]).toMatchObject({
      type: "adjust",
      points: -120,
      balanceAfter: 0,
    });

    // Simulate the ledger idempotency guard being exercised on a re-run: reset
    // `anonymizedAt` (so the top-of-procedure "already anonymized" check
    // doesn't short-circuit first) and give the customer a balance again, then
    // anonymize once more. The ledger write for the same sourceKey must hit
    // the unique constraint and be swallowed rather than thrown, and no
    // second clawback row should appear.
    await db.customer.update({
      where: { id: customer.id },
      data: { anonymizedAt: null, loyaltyPoints: 50 },
    });

    await expect(
      caller.customer.anonymize({ id: customer.id }),
    ).resolves.toEqual({ success: true });

    const clawbackRowsAfterRerun = await db.loyaltyLedger.findMany({
      where: { customerId: customer.id, sourceKey: `anonymize:${customer.id}` },
    });
    expect(clawbackRowsAfterRerun).toHaveLength(1);

    const afterSecond = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(afterSecond.loyaltyPoints).toBe(0);
  });
});
