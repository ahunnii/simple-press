import { beforeEach, describe, expect, it, vi } from "vitest";

import { awardBirthdayPoints, birthdayTargets } from "~/lib/loyalty/birthday";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createLoyaltyProgram,
} from "../helpers/factories";

// Lib-level tests: the cron helper is called directly, so nothing here
// resolves a tenant from the request host. The mock matches the other
// integration tests so that a transitive `next/headers` import can never turn
// into a confusing failure.
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers({ host: "birthday.simplepress.test" })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `awardBirthdayPoints` only imports sendLoyaltyBirthdayEmail from the
// templates module.
const emailMocks = vi.hoisted(() => ({
  sendLoyaltyBirthdayEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("~/lib/email/templates", () => ({
  sendLoyaltyBirthdayEmail: (...args: unknown[]): unknown =>
    emailMocks.sendLoyaltyBirthdayEmail(...args),
}));

/**
 * A fixed instant for every run, so a test never depends on the day it is
 * executed. The customers' birthdays are derived from `birthdayTargets` rather
 * than hardcoded, so the fixture and the production rule can't drift apart.
 */
const NOW = new Date("2026-06-15T12:00:00Z");

/** A business with the loyalty flag on and a 25-point birthday rule. */
async function setupStore(
  opts: {
    featureFlags?: Record<string, boolean>;
    timeZone?: string;
    birthdayBonus?: number;
  } = {},
) {
  const business = await createBusiness({
    featureFlags: opts.featureFlags ?? { loyalty: true },
    timeZone: opts.timeZone ?? "UTC",
  });
  await createLoyaltyProgram(business.id, {
    birthdayEnabled: true,
    birthdayBonus: opts.birthdayBonus ?? 25,
  });
  return business;
}

/** A customer whose stored birthday is `month`/`day`. */
async function createCustomerWithBirthday(
  businessId: string,
  birthday: { month: number; day: number },
  extra: { anonymizedAt?: Date } = {},
) {
  const customer = await createCustomer(businessId);
  return db.customer.update({
    where: { id: customer.id },
    data: {
      birthMonth: birthday.month,
      birthDay: birthday.day,
      ...(extra.anonymizedAt !== undefined
        ? { anonymizedAt: extra.anonymizedAt }
        : {}),
    },
  });
}

/** Current `Customer.loyaltyPoints` straight from the row. */
async function storedBalance(customerId: string): Promise<number> {
  const row = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  });
  return row.loyaltyPoints;
}

function ledgerRows(businessId: string) {
  return db.loyaltyLedger.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
    select: { type: true, points: true, sourceKey: true, customerId: true },
  });
}

describe("loyalty birthday cron sweep", () => {
  beforeEach(async () => {
    await resetDb();
    emailMocks.sendLoyaltyBirthdayEmail.mockClear();
  });

  it("awards the bonus to a customer whose birthday is today and emails them", async () => {
    const business = await setupStore();
    const { year, today } = birthdayTargets(NOW, "UTC");
    const customer = await createCustomerWithBirthday(business.id, today);

    const awarded = await awardBirthdayPoints(db, { now: NOW });

    expect(awarded).toBe(1);
    expect(await storedBalance(customer.id)).toBe(25);

    const rows = await ledgerRows(business.id);
    expect(rows).toEqual([
      {
        type: "birthday_bonus",
        points: 25,
        sourceKey: `birthday:${customer.id}:${year}`,
        customerId: customer.id,
      },
    ]);

    expect(emailMocks.sendLoyaltyBirthdayEmail).toHaveBeenCalledTimes(1);
    expect(emailMocks.sendLoyaltyBirthdayEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customer.email,
        points: 25,
        balance: 25,
        customerId: customer.id,
        year,
      }),
    );
  });

  it("is idempotent within the same year: a second tick awards nothing and sends nothing", async () => {
    const business = await setupStore();
    const { today } = birthdayTargets(NOW, "UTC");
    const customer = await createCustomerWithBirthday(business.id, today);

    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(1);
    // The cron runs ~96 times on the customer's birthday; only the first tick
    // may write. The ledger's unique sourceKey is what enforces that.
    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(0);

    expect(await ledgerRows(business.id)).toHaveLength(1);
    expect(await storedBalance(customer.id)).toBe(25);
    expect(emailMocks.sendLoyaltyBirthdayEmail).toHaveBeenCalledTimes(1);
  });

  it("ignores a customer whose birthday is not today", async () => {
    const business = await setupStore();
    const { today } = birthdayTargets(NOW, "UTC");
    // One day later in the same month — never the Feb 28/29 special case.
    const customer = await createCustomerWithBirthday(business.id, {
      month: today.month,
      day: today.day + 1,
    });

    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(0);
    expect(await ledgerRows(business.id)).toHaveLength(0);
    expect(await storedBalance(customer.id)).toBe(0);
    expect(emailMocks.sendLoyaltyBirthdayEmail).not.toHaveBeenCalled();
  });

  it("skips a business whose loyalty flag is off, writing nothing", async () => {
    const business = await setupStore({ featureFlags: { loyalty: false } });
    const { today } = birthdayTargets(NOW, "UTC");
    const customer = await createCustomerWithBirthday(business.id, today);

    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(0);
    expect(await ledgerRows(business.id)).toHaveLength(0);
    expect(await storedBalance(customer.id)).toBe(0);
    expect(emailMocks.sendLoyaltyBirthdayEmail).not.toHaveBeenCalled();
  });

  it("skips an anonymized customer", async () => {
    const business = await setupStore();
    const { today } = birthdayTargets(NOW, "UTC");
    const customer = await createCustomerWithBirthday(business.id, today, {
      anonymizedAt: new Date("2026-01-02T00:00:00Z"),
    });

    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(0);
    expect(await ledgerRows(business.id)).toHaveLength(0);
    expect(await storedBalance(customer.id)).toBe(0);
    expect(emailMocks.sendLoyaltyBirthdayEmail).not.toHaveBeenCalled();
  });

  it("awards a February 29th birthday on February 28th of a non-leap year", async () => {
    const business = await setupStore();
    const leapDayNow = new Date("2026-02-28T12:00:00Z");
    const { year, targets } = birthdayTargets(leapDayNow, "UTC");
    // Guards the fixture itself: this date must produce the Feb-28/29 pair.
    expect(targets).toEqual([
      { month: 2, day: 28 },
      { month: 2, day: 29 },
    ]);

    const customer = await createCustomerWithBirthday(business.id, {
      month: 2,
      day: 29,
    });

    expect(await awardBirthdayPoints(db, { now: leapDayNow })).toBe(1);
    expect(await storedBalance(customer.id)).toBe(25);

    const rows = await ledgerRows(business.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceKey).toBe(`birthday:${customer.id}:${year}`);
    expect(emailMocks.sendLoyaltyBirthdayEmail).toHaveBeenCalledTimes(1);
  });

  it("awards again the following year under a different sourceKey", async () => {
    const business = await setupStore();
    const { today } = birthdayTargets(NOW, "UTC");
    const customer = await createCustomerWithBirthday(business.id, today);

    const nextYear = new Date("2027-06-15T12:00:00Z");

    expect(await awardBirthdayPoints(db, { now: NOW })).toBe(1);
    expect(await awardBirthdayPoints(db, { now: nextYear })).toBe(1);

    const rows = await ledgerRows(business.id);
    expect(rows.map((row) => row.sourceKey)).toEqual([
      `birthday:${customer.id}:2026`,
      `birthday:${customer.id}:2027`,
    ]);
    expect(await storedBalance(customer.id)).toBe(50);
    expect(emailMocks.sendLoyaltyBirthdayEmail).toHaveBeenCalledTimes(2);
  });
});
