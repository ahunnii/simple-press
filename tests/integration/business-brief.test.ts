import { beforeEach, describe, expect, it } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createDiscount,
  createOrder,
  createOwnerUser,
  createPage,
  createProduct,
  createUser,
} from "../helpers/factories";

describe("platform.getBusinessBrief", () => {
  beforeEach(resetDb);

  async function createAdminCaller() {
    const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
    return createTestCaller({
      userId: admin.id,
      email: admin.email,
      platformRole: "PLATFORM_ADMIN",
    });
  }

  describe("authorization", () => {
    it("lets a PLATFORM_ADMIN copy a brief", async () => {
      const business = await createBusiness({
        name: "Bloom Apothecary",
        subdomain: "brief-admin",
      });
      const caller = await createAdminCaller();

      const { markdown } = await caller.platform.getBusinessBrief({
        businessId: business.id,
      });

      expect(markdown).toContain("# Bloom Apothecary");
      expect(markdown).toContain("URL: https://brief-admin.simplepress.test");
    });

    it("rejects a BUSINESS_USER — including the store OWNER — with FORBIDDEN", async () => {
      const business = await createBusiness({ subdomain: "brief-owner" });
      const owner = await createOwnerUser(business.id);
      const caller = createTestCaller({
        userId: owner.id,
        email: owner.email,
        platformRole: "BUSINESS_USER",
      });

      await expect(
        caller.platform.getBusinessBrief({ businessId: business.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("rejects a null-session caller with UNAUTHORIZED", async () => {
      const business = await createBusiness({ subdomain: "brief-anon" });
      const caller = createTestCaller({});

      await expect(
        caller.platform.getBusinessBrief({ businessId: business.id }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns NOT_FOUND for a nonexistent businessId", async () => {
      const caller = await createAdminCaller();

      await expect(
        caller.platform.getBusinessBrief({
          businessId: "no-such-business-id",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("content", () => {
    it("includes public identity, site SEO, catalog names, and FAQs", async () => {
      const business = await createBusiness({
        name: "Bloom Apothecary",
        subdomain: "brief-content",
      });

      await db.business.update({
        where: { id: business.id },
        data: {
          supportEmail: "hello@bloom.test",
          phoneNumber: "+1 313 555 0100",
          addressCity: "Detroit",
          addressState: "MI",
        },
      });

      await db.siteContent.create({
        data: {
          businessId: business.id,
          metaTitle: "Small-batch botanical skincare",
        },
      });

      await createProduct(business.id, {
        name: "Signature Candle",
        published: true,
      });
      await createProduct(business.id, {
        name: "Draft Balm",
        published: false,
      });
      await createPage(business.id, {
        title: "About",
        type: "page",
        published: true,
      });
      await createPage(business.id, {
        title: "Hidden draft post",
        type: "blog",
        published: true,
      });
      await db.faqItem.create({
        data: {
          businessId: business.id,
          question: "Do you ship nationwide?",
          answer: "Yes, within 3–5 days.",
        },
      });

      const caller = await createAdminCaller();
      const { markdown } = await caller.platform.getBusinessBrief({
        businessId: business.id,
      });

      expect(markdown).toContain("# Bloom Apothecary");
      expect(markdown).toContain("Location: Detroit, MI");
      expect(markdown).toContain("Phone: +1 313 555 0100");
      expect(markdown).toContain("Email: hello@bloom.test");
      expect(markdown).toContain("Title: Small-batch botanical skincare");
      expect(markdown).toContain("Description: (not set)");
      expect(markdown).toContain("- Signature Candle");
      expect(markdown).not.toContain("Draft Balm");
      expect(markdown).toContain("- About");
      expect(markdown).not.toContain("Hidden draft post");
      expect(markdown).toContain("Q: Do you ship nationwide?");
      expect(markdown).toContain("A: Yes, within 3–5 days.");
    });
  });

  describe("redaction", () => {
    it("never leaks private fields while still including supportEmail", async () => {
      const business = await createBusiness({ subdomain: "brief-redact" });

      await db.business.update({
        where: { id: business.id },
        data: {
          ownerEmail: "SENTINEL-OWNER-EMAIL@example.test",
          stripeAccountId: "SENTINEL-STRIPE-ACCT",
          supportEmail: "support@public-store.test",
        },
      });

      const customer = await createCustomer(business.id, {
        email: "SENTINEL-CUSTOMER-EMAIL@example.test",
      });
      await createOrder(business.id, {
        customerId: customer.id,
        customerEmail: "SENTINEL-CUSTOMER-EMAIL@example.test",
        customerName: "SENTINEL-ORDER-CUSTOMER-NAME",
        items: [{ productName: "SENTINEL-ORDER-ITEM-NAME" }],
      });
      await createDiscount(business.id, { code: "SENTINEL-DISCOUNT-CODE" });
      await createProduct(business.id, {
        name: "Sentinel Product",
        published: true,
        inventoryQty: 5150913,
      });

      const caller = await createAdminCaller();
      const { markdown } = await caller.platform.getBusinessBrief({
        businessId: business.id,
      });

      for (const sentinel of [
        "SENTINEL-OWNER-EMAIL@example.test",
        "SENTINEL-STRIPE-ACCT",
        "SENTINEL-CUSTOMER-EMAIL@example.test",
        "SENTINEL-ORDER-CUSTOMER-NAME",
        "SENTINEL-ORDER-ITEM-NAME",
        "SENTINEL-DISCOUNT-CODE",
        "5150913",
      ]) {
        expect(markdown).not.toContain(sentinel);
      }

      expect(markdown).toContain("Email: support@public-store.test");
      expect(markdown).toContain("- Sentinel Product");
    });
  });
});
