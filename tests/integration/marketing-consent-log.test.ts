import { beforeEach, describe, expect, it } from "vitest";

import { recordConsentEvent } from "~/lib/marketing/consent-log";
import {
  addToDoNotEmail,
  hashEmailForDoNotEmail,
  isOnDoNotEmailList,
  removeFromDoNotEmail,
} from "~/lib/marketing/do-not-email";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createCustomer } from "../helpers/factories";

/**
 * `MarketingConsentEvent` + `MarketingDoNotEmail` helpers against real
 * Postgres and the real prisma-field-encryption extension: ip / userAgent are
 * ciphertext at rest (raw SQL never sees the plaintext) yet round-trip through
 * the extended client, including inside an interactive transaction; the
 * do-not-email list is idempotent, never downgrades a reason, and is scoped per
 * store.
 */

const IP = "203.0.113.42";
const UA = "Mozilla/5.0 (Macintosh) ConsentLogTest/1.0";

beforeEach(async () => {
  await resetDb();
});

describe("recordConsentEvent", () => {
  it("encrypts ip and userAgent at rest and decrypts on read (inside a transaction)", async () => {
    const business = await createBusiness();
    const customer = await createCustomer(business.id);

    const { id } = await db.$transaction((tx) =>
      recordConsentEvent(tx, {
        businessId: business.id,
        customerId: customer.id,
        type: "OPT_IN",
        source: "NEWSLETTER_FORM",
        ip: IP,
        userAgent: UA,
        wording: "Email me news and offers.",
      }),
    );

    const [raw] = await db.$queryRaw<
      { ip: string | null; userAgent: string | null; wording: string | null }[]
    >`SELECT "ip", "userAgent", "wording" FROM "MarketingConsentEvent" WHERE "id" = ${id}`;
    expect(raw).toBeDefined();
    expect(raw!.ip).toBeTruthy();
    expect(raw!.userAgent).toBeTruthy();
    expect(raw!.ip).not.toBe(IP);
    expect(raw!.ip).not.toContain(IP);
    expect(raw!.userAgent).not.toBe(UA);
    expect(raw!.userAgent).not.toContain("ConsentLogTest");
    // wording is deliberately plaintext.
    expect(raw!.wording).toBe("Email me news and offers.");

    const row = await db.marketingConsentEvent.findUniqueOrThrow({
      where: { id },
    });
    expect(row).toMatchObject({
      businessId: business.id,
      customerId: customer.id,
      type: "OPT_IN",
      source: "NEWSLETTER_FORM",
      ip: IP,
      userAgent: UA,
      campaignId: null,
    });
  });

  it("truncates oversized ip / userAgent before storing and accepts nulls", async () => {
    const business = await createBusiness();
    const customer = await createCustomer(business.id);

    const long = await recordConsentEvent(db, {
      businessId: business.id,
      customerId: customer.id,
      type: "OPT_OUT",
      source: "UNSUBSCRIBE_LINK",
      ip: "9".repeat(300),
      userAgent: "a".repeat(5000),
    });
    const bare = await recordConsentEvent(db, {
      businessId: business.id,
      customerId: null,
      type: "SUPPRESSED",
      source: "HARD_BOUNCE",
    });

    const rows = await db.marketingConsentEvent.findMany({
      where: { id: { in: [long.id, bare.id] } },
    });
    const longRow = rows.find((r) => r.id === long.id)!;
    const bareRow = rows.find((r) => r.id === bare.id)!;
    expect(longRow.ip).toHaveLength(64);
    expect(longRow.userAgent).toHaveLength(512);
    expect(bareRow).toMatchObject({
      ip: null,
      userAgent: null,
      customerId: null,
    });
  });

  it("keeps the event with customerId nulled when the customer row is hard-deleted", async () => {
    const business = await createBusiness();
    const customer = await createCustomer(business.id);
    const { id } = await recordConsentEvent(db, {
      businessId: business.id,
      customerId: customer.id,
      type: "OPT_IN",
      source: "CHECKOUT",
    });

    await db.customer.delete({ where: { id: customer.id } });

    const row = await db.marketingConsentEvent.findUniqueOrThrow({
      where: { id },
    });
    expect(row.customerId).toBeNull();
  });
});

describe("do-not-email list", () => {
  it("stores only the hash, and add / is / remove round-trip", async () => {
    const business = await createBusiness();

    expect(await isOnDoNotEmailList(db, business.id, "Foo@X.com")).toBeNull();

    await db.$transaction((tx) =>
      addToDoNotEmail(tx, business.id, "Foo@X.com", "UNSUBSCRIBED"),
    );

    // Lookup normalizes the address the same way.
    expect(await isOnDoNotEmailList(db, business.id, " foo@x.com ")).toEqual({
      reason: "UNSUBSCRIBED",
    });

    const [raw] = await db.$queryRaw<{ emailHash: string }[]>`
      SELECT "emailHash" FROM "MarketingDoNotEmail" WHERE "businessId" = ${business.id}`;
    expect(raw!.emailHash).toBe(hashEmailForDoNotEmail("foo@x.com"));
    expect(raw!.emailHash).not.toContain("foo");

    expect(await removeFromDoNotEmail(db, business.id, "FOO@x.com")).toBe(true);
    expect(await isOnDoNotEmailList(db, business.id, "foo@x.com")).toBeNull();
    expect(await removeFromDoNotEmail(db, business.id, "foo@x.com")).toBe(
      false,
    );
  });

  it("is idempotent and never downgrades the stored reason", async () => {
    const business = await createBusiness();
    const email = "dup@x.com";

    await addToDoNotEmail(db, business.id, email, "UNSUBSCRIBED");
    await addToDoNotEmail(db, business.id, email, "UNSUBSCRIBED");
    expect(
      await db.marketingDoNotEmail.count({
        where: { businessId: business.id },
      }),
    ).toBe(1);

    // Raised to the stronger reason...
    expect(await addToDoNotEmail(db, business.id, email, "COMPLAINT")).toEqual({
      reason: "COMPLAINT",
    });
    // ...and a weaker one later keeps it.
    expect(
      await addToDoNotEmail(db, business.id, email, "UNSUBSCRIBED"),
    ).toEqual({ reason: "COMPLAINT" });
    expect(await isOnDoNotEmailList(db, business.id, email)).toEqual({
      reason: "COMPLAINT",
    });
  });

  it("onlyReasons removes only matching rows", async () => {
    const business = await createBusiness();
    await addToDoNotEmail(db, business.id, "c@x.com", "COMPLAINT");
    await addToDoNotEmail(db, business.id, "u@x.com", "UNSUBSCRIBED");

    expect(
      await removeFromDoNotEmail(db, business.id, "c@x.com", {
        onlyReasons: ["UNSUBSCRIBED"],
      }),
    ).toBe(false);
    expect(await isOnDoNotEmailList(db, business.id, "c@x.com")).toEqual({
      reason: "COMPLAINT",
    });

    expect(
      await removeFromDoNotEmail(db, business.id, "u@x.com", {
        onlyReasons: ["UNSUBSCRIBED"],
      }),
    ).toBe(true);
    expect(await isOnDoNotEmailList(db, business.id, "u@x.com")).toBeNull();
  });

  it("is scoped per store", async () => {
    const a = await createBusiness();
    const b = await createBusiness();
    await addToDoNotEmail(db, a.id, "shared@x.com", "HARD_BOUNCE");

    expect(await isOnDoNotEmailList(db, a.id, "shared@x.com")).toEqual({
      reason: "HARD_BOUNCE",
    });
    expect(await isOnDoNotEmailList(db, b.id, "shared@x.com")).toBeNull();
    expect(await removeFromDoNotEmail(db, b.id, "shared@x.com")).toBe(false);
    expect(await isOnDoNotEmailList(db, a.id, "shared@x.com")).not.toBeNull();
  });
});
