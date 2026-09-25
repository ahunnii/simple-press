import { describe, expect, it } from "vitest";

import { getActiveNavHref, isPathAllowedForRole } from "./admin-nav";

describe("isPathAllowedForRole", () => {
  describe("OWNER role", () => {
    it("allows access to /admin/orders", () => {
      expect(isPathAllowedForRole("/admin/orders", "OWNER")).toBe(true);
    });

    it("allows access to /admin/customers", () => {
      expect(isPathAllowedForRole("/admin/customers", "OWNER")).toBe(true);
    });

    it("allows access to /admin/inventory", () => {
      expect(isPathAllowedForRole("/admin/inventory", "OWNER")).toBe(true);
    });

    it("allows access to /admin/products", () => {
      expect(isPathAllowedForRole("/admin/products", "OWNER")).toBe(true);
    });

    it("allows access to /admin/settings/team", () => {
      expect(isPathAllowedForRole("/admin/settings/team", "OWNER")).toBe(true);
    });
  });

  describe("MANAGER role", () => {
    it("allows access to /admin/orders", () => {
      expect(isPathAllowedForRole("/admin/orders", "MANAGER")).toBe(true);
    });

    it("allows access to /admin/customers", () => {
      expect(isPathAllowedForRole("/admin/customers", "MANAGER")).toBe(true);
    });

    it("allows access to /admin/inventory", () => {
      expect(isPathAllowedForRole("/admin/inventory", "MANAGER")).toBe(true);
    });

    it("allows access to /admin/products", () => {
      expect(isPathAllowedForRole("/admin/products", "MANAGER")).toBe(true);
    });
  });

  describe("STAFF role", () => {
    it("allows access to /admin/orders", () => {
      expect(isPathAllowedForRole("/admin/orders", "STAFF")).toBe(true);
    });

    it("allows access to /admin/orders/123", () => {
      expect(isPathAllowedForRole("/admin/orders/123", "STAFF")).toBe(true);
    });

    it("allows access to /admin/customers", () => {
      expect(isPathAllowedForRole("/admin/customers", "STAFF")).toBe(true);
    });

    it("allows access to /admin/customers/abc", () => {
      expect(isPathAllowedForRole("/admin/customers/abc", "STAFF")).toBe(true);
    });

    it("allows access to /admin/inventory", () => {
      expect(isPathAllowedForRole("/admin/inventory", "STAFF")).toBe(true);
    });

    it("allows access to /admin/inventory/checkouts/abc", () => {
      expect(
        isPathAllowedForRole("/admin/inventory/checkouts/abc", "STAFF"),
      ).toBe(true);
    });

    it("denies access to /admin/inventoryx", () => {
      expect(isPathAllowedForRole("/admin/inventoryx", "STAFF")).toBe(false);
    });

    it("denies access to /admin/products", () => {
      expect(isPathAllowedForRole("/admin/products", "STAFF")).toBe(false);
    });

    it("denies access to /admin/settings/team", () => {
      expect(isPathAllowedForRole("/admin/settings/team", "STAFF")).toBe(false);
    });
  });

  describe("PLATFORM_ADMIN (null role)", () => {
    it("allows access to /admin/orders", () => {
      expect(isPathAllowedForRole("/admin/orders", null)).toBe(true);
    });

    it("allows access to /admin/products", () => {
      expect(isPathAllowedForRole("/admin/products", null)).toBe(true);
    });

    it("allows access to /admin/settings/team", () => {
      expect(isPathAllowedForRole("/admin/settings/team", null)).toBe(true);
    });

    it("allows access to /admin/anything", () => {
      expect(isPathAllowedForRole("/admin/anything", null)).toBe(true);
    });
  });
});

describe("getActiveNavHref", () => {
  it("picks the more specific href when both a hub and its child match", () => {
    expect(
      getActiveNavHref("/admin/content/pages", [
        "/admin/content",
        "/admin/content/pages",
      ]),
    ).toBe("/admin/content/pages");
  });

  it("falls back to the hub href when no child href matches", () => {
    expect(
      getActiveNavHref("/admin/content/seo", [
        "/admin/content",
        "/admin/content/pages",
      ]),
    ).toBe("/admin/content");
  });

  it("matches a deeper sub-route to its nearest ancestor href", () => {
    expect(
      getActiveNavHref("/admin/content/pages/abc/edit", [
        "/admin/content",
        "/admin/content/pages",
      ]),
    ).toBe("/admin/content/pages");
  });

  it("does not treat a href as a prefix match without a segment boundary", () => {
    expect(
      getActiveNavHref("/admin/contentfoo", [
        "/admin/content",
        "/admin/content/pages",
      ]),
    ).toBeNull();
  });

  it("never matches an external href, even against an unusual pathname", () => {
    expect(
      getActiveNavHref("https://help.example.com", [
        "https://help.example.com",
      ]),
    ).toBeNull();
  });

  it("is independent of href order — the longer href still wins when listed first", () => {
    expect(
      getActiveNavHref("/admin/content/pages", [
        "/admin/content/pages",
        "/admin/content",
      ]),
    ).toBe("/admin/content/pages");
  });
});
