import { describe, expect, it } from "vitest";

import { getAccountNavLinks } from "./account-links";

describe("getAccountNavLinks", () => {
  it("returns every link, in order, when all flags are enabled and admin is included", () => {
    expect(
      getAccountNavLinks({ isEnabled: () => true, includeAdmin: true }),
    ).toEqual([
      { key: "orders", label: "Orders", href: "/account/orders" },
      {
        key: "address-book",
        label: "Address Book",
        href: "/account/address-book",
      },
      {
        key: "subscriptions",
        label: "Subscriptions",
        href: "/account/subscriptions",
      },
      { key: "invoices", label: "Invoices", href: "/account/invoices" },
      { key: "rewards", label: "Rewards", href: "/account/rewards" },
      { key: "settings", label: "Settings", href: "/account/settings" },
      { key: "security", label: "Security", href: "/account/security" },
      {
        key: "preferences",
        label: "Preferences",
        href: "/account/preferences",
      },
      { key: "admin", label: "Admin", href: "/admin" },
    ]);
  });

  it("drops every flag-gated link, keeps the always-on ones, and omits admin by default", () => {
    expect(getAccountNavLinks({ isEnabled: () => false })).toEqual([
      { key: "settings", label: "Settings", href: "/account/settings" },
      { key: "security", label: "Security", href: "/account/security" },
      {
        key: "preferences",
        label: "Preferences",
        href: "/account/preferences",
      },
    ]);
  });

  it("gates Orders on 'orders' and Address Book on 'checkout', independently", () => {
    expect(
      getAccountNavLinks({ isEnabled: (flag) => flag === "orders" }).map(
        (l) => l.key,
      ),
    ).toEqual(["orders", "settings", "security", "preferences"]);
    expect(
      getAccountNavLinks({ isEnabled: (flag) => flag === "checkout" }).map(
        (l) => l.key,
      ),
    ).toEqual(["address-book", "settings", "security", "preferences"]);
  });

  it("gates Subscriptions, Invoices, and Rewards independently", () => {
    const links = getAccountNavLinks({
      isEnabled: (flag) =>
        flag === "subscriptions" || flag === "invoices" || flag === "loyalty",
    });
    expect(links.map((l) => l.key)).toEqual([
      "subscriptions",
      "invoices",
      "rewards",
      "settings",
      "security",
      "preferences",
    ]);
  });

  it("appends Admin only when includeAdmin is true", () => {
    expect(
      getAccountNavLinks({ isEnabled: () => false, includeAdmin: false }),
    ).not.toContainEqual(expect.objectContaining({ key: "admin" }));
    expect(
      getAccountNavLinks({ isEnabled: () => false, includeAdmin: true }),
    ).toContainEqual({ key: "admin", label: "Admin", href: "/admin" });
  });
});
