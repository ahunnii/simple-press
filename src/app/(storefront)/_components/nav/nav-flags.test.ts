import { describe, expect, it } from "vitest";

import {
  filterNavByFlags,
  navHrefEnabled,
  navHrefFlag,
  navHrefOffFlag,
} from "./nav-flags";
import type { NavItem } from "./resolve-nav";

const only =
  (...off: string[]) =>
  (key: string) =>
    !off.includes(key);

describe("navHrefFlag", () => {
  it("matches on the first path segment only", () => {
    expect(navHrefFlag("/shop")).toBe("products");
    expect(navHrefFlag("/shop/x")).toBe("products");
    expect(navHrefFlag("/shop?sort=new")).toBe("products");
    expect(navHrefFlag("/shop#top")).toBe("products");
    expect(navHrefFlag("/shopping")).toBeNull();
    expect(navHrefFlag("/donate")).toBe("donations");
    expect(navHrefFlag("/about")).toBeNull();
    expect(navHrefFlag("/")).toBeNull();
  });

  it("maps checkout, subscribe and account routes, longest prefix winning", () => {
    expect(navHrefFlag("/checkout")).toBe("checkout");
    expect(navHrefFlag("/subscribe?product=x")).toBe("subscriptions");
    expect(navHrefFlag("/account")).toBe("customerAccounts");
    expect(navHrefFlag("/account/")).toBe("customerAccounts");
    expect(navHrefFlag("/account/settings")).toBe("customerAccounts");
    expect(navHrefFlag("/account/address-book")).toBe("customerAccounts");
    expect(navHrefFlag("/account/orders")).toBe("orders");
    expect(navHrefFlag("/account/orders/abc")).toBe("orders");
    expect(navHrefFlag("/account/subscriptions")).toBe("subscriptions");
    expect(navHrefFlag("/account/invoices")).toBe("invoices");
    expect(navHrefFlag("/account/rewards")).toBe("loyalty");
    expect(navHrefFlag("/Account/Rewards")).toBe("loyalty");
  });

  it("matches whole segments, never a longer word", () => {
    expect(navHrefFlag("/accounting")).toBeNull();
    expect(navHrefFlag("/checkouts")).toBeNull();
    expect(navHrefFlag("/subscriber")).toBeNull();
    expect(navHrefFlag("/account/ordersx")).toBe("customerAccounts");
  });

  it("never gates non-path hrefs", () => {
    expect(navHrefFlag("https://example.com/shop")).toBeNull();
    expect(navHrefFlag("//cdn.example.com/shop")).toBeNull();
    expect(navHrefFlag("mailto:a@b.co")).toBeNull();
    expect(navHrefFlag("")).toBeNull();
  });
});

describe("navHrefEnabled", () => {
  it("requires every flag along the prefix chain", () => {
    expect(navHrefEnabled("/account/rewards", only("loyalty"))).toBe(false);
    expect(navHrefEnabled("/account/orders", only("customerAccounts"))).toBe(
      false,
    );
    expect(navHrefEnabled("/account/orders", only("loyalty"))).toBe(true);
    expect(navHrefEnabled("/about", () => false)).toBe(true);
  });
});

describe("navHrefOffFlag", () => {
  it("names the first off flag on the prefix chain, or null", () => {
    expect(navHrefOffFlag("/account/orders", only("customerAccounts"))).toBe(
      "customerAccounts",
    );
    expect(navHrefOffFlag("/account/orders", only("orders"))).toBe("orders");
    expect(navHrefOffFlag("/account/orders", () => true)).toBeNull();
    expect(navHrefOffFlag("/shop", only("products"))).toBe("products");
    expect(navHrefOffFlag("/about", () => false)).toBeNull();
    expect(navHrefOffFlag("https://x.test/shop", () => false)).toBeNull();
  });

  it("keeps the caller's `flag === null || isEnabled(flag)` check correct", () => {
    const isEnabled = only("customerAccounts");
    const flag = navHrefOffFlag("/account/orders", isEnabled);
    expect(flag === null || isEnabled(flag)).toBe(false);
  });
});

describe("filterNavByFlags", () => {
  it("drops account sub-routes, checkout and subscribe by their own flags", () => {
    const items: NavItem[] = [
      { label: "Rewards", href: "/account/rewards" },
      { label: "Orders", href: "/account/orders" },
      { label: "Checkout", href: "/checkout" },
      { label: "Subscribe", href: "/subscribe" },
      { label: "Accounting", href: "/accounting" },
    ];
    expect(
      filterNavByFlags(items, only("loyalty", "checkout", "subscriptions")),
    ).toEqual([
      { label: "Orders", href: "/account/orders" },
      { label: "Accounting", href: "/accounting" },
    ]);
    expect(filterNavByFlags(items, only("customerAccounts"))).toEqual([
      { label: "Checkout", href: "/checkout" },
      { label: "Subscribe", href: "/subscribe" },
      { label: "Accounting", href: "/accounting" },
    ]);
  });

  it("drops /shop and /shop/x when products is off, but keeps /shopping", () => {
    const items: NavItem[] = [
      { label: "Shop", href: "/shop" },
      { label: "Item", href: "/shop/x" },
      { label: "Shopping guide", href: "/shopping" },
    ];
    expect(filterNavByFlags(items, only("products"))).toEqual([
      { label: "Shopping guide", href: "/shopping" },
    ]);
  });

  it("leaves external links untouched even when their path looks gated", () => {
    const items: NavItem[] = [
      { label: "Blog", href: "/blog-elsewhere/shop", external: true },
      { label: "Ext", href: "https://example.com/shop", external: true },
    ];
    expect(filterNavByFlags(items, only("products", "blog"))).toEqual(items);
  });

  it("drops an empty-href group whose children were all gated", () => {
    const items: NavItem[] = [
      {
        label: "More",
        href: "",
        children: [
          { label: "Videos", href: "/videos" },
          { label: "Events", href: "/events" },
        ],
      },
    ];
    expect(filterNavByFlags(items, only("videos", "events"))).toEqual([]);
  });

  it("keeps a group with surviving children and filters the rest", () => {
    const items: NavItem[] = [
      {
        label: "More",
        href: "",
        children: [
          { label: "Videos", href: "/videos" },
          { label: "About", href: "/about" },
          { label: "Ext", href: "https://x.test/videos", external: true },
        ],
      },
    ];
    expect(filterNavByFlags(items, only("videos"))).toEqual([
      {
        label: "More",
        href: "",
        children: [
          { label: "About", href: "/about" },
          { label: "Ext", href: "https://x.test/videos", external: true },
        ],
      },
    ]);
  });

  it("drops a parent whose own href is gated, children and all", () => {
    const items: NavItem[] = [
      {
        label: "Services",
        href: "/services",
        children: [{ label: "About", href: "/about" }],
      },
    ];
    expect(filterNavByFlags(items, only("services"))).toEqual([]);
  });

  it("keeps a parent with an href but no surviving children, as a plain link", () => {
    const items: NavItem[] = [
      {
        label: "Explore",
        href: "/about",
        children: [{ label: "Blog", href: "/blog" }],
      },
    ];
    expect(filterNavByFlags(items, only("blog"))).toEqual([
      { label: "Explore", href: "/about" },
    ]);
  });

  it("returns everything when all flags are on and does not mutate input", () => {
    const items: NavItem[] = [
      { label: "Shop", href: "/shop" },
      {
        label: "More",
        href: "",
        children: [{ label: "Donate", href: "/donate" }],
      },
    ];
    const snapshot = structuredClone(items);
    expect(filterNavByFlags(items, () => true)).toEqual(items);
    filterNavByFlags(items, () => false);
    expect(items).toEqual(snapshot);
  });
});
