import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashEmailForDoNotEmail } from "~/lib/marketing/do-not-email";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * `contactImport` router (src/server/api/routers/contact-import.ts): platform
 * admin only to preview/commit, owners and managers read the history. The
 * compliance core is asserted directly: an import never opts anyone in and
 * never touches an existing Customer.
 */
const reqHost = vi.hoisted(() => ({ value: "import-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const WIX_CSV = [
  "First Name,Last Name,Email 1,Email subscriber status",
  "Ann,Ray,ann@example.com,Subscribed",
  "Bob,Fox,bob@example.com,Unsubscribed",
  "Cat,Lee,cat@example.com,Never subscribed",
  "Dan,Poe,dan@example.com,Subscribed",
  "Dup,Licate,ann@example.com,Unsubscribed",
  "Bad,Row,not-an-email,Subscribed",
].join("\n");

async function setup() {
  const business = await createBusiness({ subdomain: "import-a" });
  reqHost.value = "import-a.simplepress.test";
  const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
  const adminCaller = createTestCaller({
    userId: admin.id,
    email: admin.email,
    platformRole: "PLATFORM_ADMIN",
  });
  const owner = await createOwnerUser(business.id);
  const ownerCaller = createTestCaller({
    userId: owner.id,
    email: owner.email,
  });
  const managerUser = await createUser();
  await createMembership(business.id, managerUser.id, "MANAGER");
  const managerCaller = createTestCaller({
    userId: managerUser.id,
    email: managerUser.email,
  });
  return { business, admin, adminCaller, ownerCaller, managerCaller };
}

describe("contactImport", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("preview", () => {
    it("reports counts and performs no writes", async () => {
      const { business, adminCaller } = await setup();
      await createCustomer(business.id, { email: "Cat@Example.com" });
      const customersBefore = await db.customer.count();

      const preview = await adminCaller.contactImport.preview({
        csvContent: WIX_CSV,
      });

      expect(preview.sourceKind).toBe("WIX");
      expect(preview.counts).toMatchObject({
        totalRows: 6,
        valid: 4,
        invalid: 1,
        duplicatesInFile: 1,
        subscribed: 1,
        unsubscribed: 2, // bob + ann (a duplicate said unsubscribed)
        unknown: 1,
        created: 3,
        matchedExisting: 1, // cat, different case
        onDoNotEmail: 0,
        inviteEligible: 1, // dan
      });
      expect(preview.errorCount).toBe(1);
      expect(preview.errors[0]).toMatchObject({ row: 6 });
      expect(preview.sample).toHaveLength(4);
      expect(
        preview.sample.find((s) => s.email === "cat@example.com"),
      ).toMatchObject({ alreadyCustomer: true });

      expect(await db.customer.count()).toBe(customersBefore);
      expect(await db.customerImport.count()).toBe(0);
      expect(await db.marketingDoNotEmail.count()).toBe(0);
      expect(await db.marketingConsentEvent.count()).toBe(0);
    });

    it("warns when there is no status column", async () => {
      const { adminCaller } = await setup();
      const preview = await adminCaller.contactImport.preview({
        csvContent: "Email\na@example.com\nb@example.com",
      });
      expect(preview.hasStatusColumn).toBe(false);
      expect(preview.counts.inviteEligible).toBe(0);
      expect(preview.warnings.join(" ")).toMatch(
        /No subscription status column/,
      );
    });

    it("counts addresses already on the do-not-email list", async () => {
      const { business, adminCaller } = await setup();
      await db.marketingDoNotEmail.create({
        data: {
          businessId: business.id,
          emailHash: hashEmailForDoNotEmail("dan@example.com"),
          reason: "COMPLAINT",
        },
      });
      const preview = await adminCaller.contactImport.preview({
        csvContent: WIX_CSV,
      });
      expect(preview.counts.onDoNotEmail).toBe(1);
      expect(preview.counts.inviteEligible).toBe(0);
    });

    it("rejects an over-cap file as BAD_REQUEST", async () => {
      const { adminCaller } = await setup();
      const rows = Array.from({ length: 5001 }, (_, i) => `u${i}@example.com`);
      await expect(
        adminCaller.contactImport.preview({
          csvContent: `Email\n${rows.join("\n")}`,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("commit", () => {
    it("creates new contacts un-opted-in and leaves existing customers untouched", async () => {
      const { business, admin, adminCaller } = await setup();
      // Existing customer, different case, already unsubscribed.
      const existing = await db.customer.create({
        data: {
          businessId: business.id,
          email: "Cat@Example.com",
          firstName: "Original",
          acceptsMarketing: false,
          marketingUnsubscribedAt: new Date("2026-01-01T00:00:00Z"),
        },
      });
      // Existing customer who IS opted in and appears as unsubscribed in the file.
      const optedIn = await db.customer.create({
        data: {
          businessId: business.id,
          email: "bob@example.com",
          acceptsMarketing: true,
          marketingConsentAt: new Date("2026-02-01T00:00:00Z"),
          marketingConsentSource: "CHECKOUT",
        },
      });
      const before = await db.customer.findMany({
        where: { id: { in: [existing.id, optedIn.id] } },
        orderBy: { id: "asc" },
      });

      const result = await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "wix-contacts.csv",
      });

      expect(result.counts).toMatchObject({
        valid: 4,
        created: 2, // ann, dan
        matchedExisting: 2, // cat, bob
        inviteEligible: 1, // dan
      });

      // Never opted in.
      expect(
        await db.customer.count({
          where: { importId: result.importId, acceptsMarketing: true },
        }),
      ).toBe(0);
      const imported = await db.customer.findMany({
        where: { importId: result.importId },
        orderBy: { email: "asc" },
      });
      expect(imported.map((c) => c.email)).toEqual([
        "ann@example.com",
        "dan@example.com",
      ]);
      expect(imported[0]).toMatchObject({
        firstName: "Ann",
        lastName: "Ray",
        acceptsMarketing: false,
      });
      expect(imported[0]!.marketingUnsubscribedAt).not.toBeNull(); // ann: dup said unsubscribed
      expect(imported[1]!.marketingUnsubscribedAt).toBeNull();

      // Existing customers byte-identical (incl. updatedAt) and no importId.
      const after = await db.customer.findMany({
        where: { id: { in: [existing.id, optedIn.id] } },
        orderBy: { id: "asc" },
      });
      expect(after).toEqual(before);
      expect(after.every((c) => c.importId === null)).toBe(true);
      expect(
        await db.customer.count({ where: { businessId: business.id } }),
      ).toBe(4);

      // Import record.
      const record = await db.customerImport.findUniqueOrThrow({
        where: { id: result.importId },
      });
      expect(record).toMatchObject({
        fileName: "wix-contacts.csv",
        sourceKind: "WIX",
        createdById: admin.id,
        attestedAt: null,
      });
      expect(record.counts).toMatchObject({ created: 2, matchedExisting: 2 });
    });

    it("puts unsubscribed rows on do-not-email; OPT_OUT/IMPORT only for NEW rows", async () => {
      const { business, adminCaller } = await setup();
      const optedIn = await db.customer.create({
        data: {
          businessId: business.id,
          email: "bob@example.com",
          acceptsMarketing: true,
        },
      });

      const result = await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "wix.csv",
      });

      // bob (existing) + ann (new, via duplicate) are unsubscribed in the file.
      const listed = await db.marketingDoNotEmail.findMany({
        where: { businessId: business.id },
      });
      expect(listed.map((r) => r.emailHash).sort()).toEqual(
        [
          hashEmailForDoNotEmail("bob@example.com"),
          hashEmailForDoNotEmail("ann@example.com"),
        ].sort(),
      );
      expect(listed.every((r) => r.reason === "UNSUBSCRIBED")).toBe(true);

      const events = await db.marketingConsentEvent.findMany({
        where: { businessId: business.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: "OPT_OUT", source: "IMPORT" });
      const ann = await db.customer.findFirstOrThrow({
        where: { importId: result.importId, email: "ann@example.com" },
      });
      expect(events[0]!.customerId).toBe(ann.id);

      // The existing opted-in customer is not unsubscribed by the import.
      const bob = await db.customer.findUniqueOrThrow({
        where: { id: optedIn.id },
      });
      expect(bob.acceptsMarketing).toBe(true);
      expect(bob.marketingUnsubscribedAt).toBeNull();
    });

    it("never downgrades a stronger do-not-email reason", async () => {
      const { business, adminCaller } = await setup();
      await db.marketingDoNotEmail.create({
        data: {
          businessId: business.id,
          emailHash: hashEmailForDoNotEmail("bob@example.com"),
          reason: "COMPLAINT",
        },
      });
      await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "wix.csv",
      });
      const row = await db.marketingDoNotEmail.findUniqueOrThrow({
        where: {
          businessId_emailHash: {
            businessId: business.id,
            emailHash: hashEmailForDoNotEmail("bob@example.com"),
          },
        },
      });
      expect(row.reason).toBe("COMPLAINT");
    });

    it("excludes do-not-email addresses from inviteEligible", async () => {
      const { business, adminCaller } = await setup();
      await db.marketingDoNotEmail.create({
        data: {
          businessId: business.id,
          emailHash: hashEmailForDoNotEmail("dan@example.com"),
          reason: "HARD_BOUNCE",
        },
      });
      const result = await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "wix.csv",
      });
      expect(result.counts.inviteEligible).toBe(0);
      expect(result.counts.onDoNotEmail).toBe(1);
    });

    it("re-importing the same file creates nothing new", async () => {
      const { adminCaller } = await setup();
      await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "a.csv",
      });
      const second = await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "b.csv",
      });
      expect(second.counts).toMatchObject({
        created: 0,
        matchedExisting: 4,
        inviteEligible: 0,
      });
    });

    it("rejects a file with no valid rows", async () => {
      const { adminCaller } = await setup();
      await expect(
        adminCaller.contactImport.commit({
          csvContent: "Email\nnope",
          fileName: "x.csv",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("accepts an explicit column map", async () => {
      const { adminCaller } = await setup();
      const result = await adminCaller.contactImport.commit({
        csvContent: "Contact,Mail,Opted\nZed,z@example.com,yes",
        columnMap: { email: "Mail", firstName: "Contact", status: "Opted" },
        fileName: "mapped.csv",
      });
      expect(result.counts).toMatchObject({
        created: 1,
        subscribed: 1,
        inviteEligible: 1,
      });
      const record = await db.customerImport.findUniqueOrThrow({
        where: { id: result.importId },
      });
      expect(record.sourceKind).toBe("CSV");
    });
  });

  describe("roles", () => {
    it("refuses OWNER and MANAGER on preview and commit", async () => {
      const { ownerCaller, managerCaller } = await setup();
      for (const caller of [ownerCaller, managerCaller]) {
        await expect(
          caller.contactImport.preview({ csvContent: WIX_CSV }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(
          caller.contactImport.commit({
            csvContent: WIX_CSV,
            fileName: "x.csv",
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(await db.customerImport.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
    });

    it("lets OWNER and MANAGER read list and get, scoped to the business", async () => {
      const { business, adminCaller, ownerCaller, managerCaller } =
        await setup();
      const { importId } = await adminCaller.contactImport.commit({
        csvContent: WIX_CSV,
        fileName: "wix.csv",
      });

      // One imported customer confirms via the invite.
      await db.customer.updateMany({
        where: { importId, email: "dan@example.com" },
        data: {
          acceptsMarketing: true,
          marketingConsentAt: new Date(),
          marketingConsentSource: "IMPORT_CONFIRM",
        },
      });
      // ... and a campaign exists for the import.
      await db.marketingCampaign.create({
        data: {
          businessId: business.id,
          subject: "Still want to hear from us?",
          contentFormat: "text",
          kind: "REPERMISSION",
          importId,
          status: "SENT",
          recipientCount: 1,
        },
      });

      // Another business's import must not leak.
      const other = await createBusiness({ subdomain: "import-b" });
      await db.customerImport.create({
        data: { businessId: other.id, fileName: "other.csv" },
      });

      for (const caller of [ownerCaller, managerCaller]) {
        const list = await caller.contactImport.list();
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({
          id: importId,
          fileName: "wix.csv",
          confirmedCount: 1,
          inviteCampaign: { status: "SENT", recipientCount: 1 },
        });
        expect(list[0]!.counts).toMatchObject({ created: 4 });
        expect(list[0]!.createdByName).toBe("Test User");

        const one = await caller.contactImport.get({ importId });
        expect(one.confirmedCount).toBe(1);
      }

      const foreign = await db.customerImport.findFirstOrThrow({
        where: { businessId: other.id },
      });
      await expect(
        ownerCaller.contactImport.get({ importId: foreign.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
  it("records what the old site said on each new row (only subscribed is invitable)", async () => {
    const { business, adminCaller } = await setup();
    await adminCaller.contactImport.commit({
      csvContent: WIX_CSV,
      fileName: "wix.csv",
    });
    const rows = await db.customer.findMany({
      where: { businessId: business.id },
      select: { email: true, importStatus: true },
      orderBy: { email: "asc" },
    });
    expect(rows).toEqual([
      { email: "ann@example.com", importStatus: "unsubscribed" },
      { email: "bob@example.com", importStatus: "unsubscribed" },
      { email: "cat@example.com", importStatus: "unknown" },
      { email: "dan@example.com", importStatus: "subscribed" },
    ]);
  });

  describe("whole-file status", () => {
    const LIST = "Email\nann@example.com\nbob@example.com";

    it("subscribed list: new rows become invite-eligible, still not opted in", async () => {
      const { business, adminCaller } = await setup();
      const { counts } = await adminCaller.contactImport.commit({
        csvContent: LIST,
        fileName: "subscribers.csv",
        fileStatus: "subscribed",
      });
      expect(counts).toMatchObject({
        subscribed: 2,
        inviteEligible: 2,
        fileStatus: "subscribed",
      });
      const rows = await db.customer.findMany({
        where: { businessId: business.id },
      });
      expect(rows.every((r) => r.acceptsMarketing === false)).toBe(true);
    });

    it("unsubscribed list blocks existing customers too, without touching their row", async () => {
      const { business, adminCaller } = await setup();
      const existing = await db.customer.update({
        where: {
          id: (await createCustomer(business.id, { email: "ann@example.com" }))
            .id,
        },
        data: { acceptsMarketing: true },
      });
      await adminCaller.contactImport.commit({
        csvContent: LIST,
        fileName: "unsubscribed.csv",
        fileStatus: "unsubscribed",
      });
      const dne = await db.marketingDoNotEmail.findMany({
        where: { businessId: business.id },
      });
      expect(dne.map((d) => d.emailHash).sort()).toEqual(
        [
          hashEmailForDoNotEmail("ann@example.com"),
          hashEmailForDoNotEmail("bob@example.com"),
        ].sort(),
      );
      const after = await db.customer.findUniqueOrThrow({
        where: { id: existing.id },
      });
      expect(after.acceptsMarketing).toBe(true);
    });

    it("is refused when the file has a status column", async () => {
      const { adminCaller } = await setup();
      await expect(
        adminCaller.contactImport.preview({
          csvContent: WIX_CSV,
          fileStatus: "subscribed",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
