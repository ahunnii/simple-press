import { describe, expect, it } from "vitest";

import {
  FEATURE_REGISTRY,
  getBlockingDependencies,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "./registry";
import { resolveFlags } from "./resolve-flags";

/** Defaults with everything the dependency chains touch switched on. */
function allOn(overrides: Record<string, boolean> = {}) {
  const flags = Object.fromEntries(
    Object.keys(FEATURE_REGISTRY).map((key) => [key, true]),
  );
  return { ...flags, ...overrides };
}

describe("getDisabledDueToDependency (transitive)", () => {
  it("disables nothing when every flag is on", () => {
    expect(getDisabledDueToDependency(allOn()).size).toBe(0);
  });

  it("Products off cascades through every dependent feature", () => {
    const disabled = getDisabledDueToDependency(allOn({ products: false }));
    for (const key of [
      "orders",
      "cart",
      "checkout",
      "collections",
      "wishlist",
      "backInStock",
      "reviews",
      "subscriptions",
      "payments",
      "coupons",
      "loyalty",
    ]) {
      expect(disabled.has(key), key).toBe(true);
    }
    // `products` itself is off by flag, not by dependency; unrelated stay on.
    expect(disabled.has("products")).toBe(false);
    expect(disabled.has("donations")).toBe(false);
    expect(disabled.has("invoices")).toBe(false);
    expect(disabled.has("inventory")).toBe(false);
  });

  it("Orders off disables payments, subscriptions and loyalty but not cart or coupons", () => {
    const disabled = getDisabledDueToDependency(allOn({ orders: false }));
    expect(disabled.has("payments")).toBe(true);
    expect(disabled.has("subscriptions")).toBe(true);
    expect(disabled.has("loyalty")).toBe(true);
    expect(disabled.has("cart")).toBe(false);
    expect(disabled.has("coupons")).toBe(false);
    expect(disabled.has("checkout")).toBe(false);
    expect(disabled.has("products")).toBe(false);
  });

  it("Cart off disables coupons, checkout, payments and subscriptions", () => {
    const disabled = getDisabledDueToDependency(allOn({ cart: false }));
    for (const key of ["coupons", "checkout", "payments", "subscriptions"]) {
      expect(disabled.has(key), key).toBe(true);
    }
    expect(disabled.has("orders")).toBe(false);
    expect(disabled.has("loyalty")).toBe(false);
  });

  it("Customer accounts off disables loyalty and reviews", () => {
    const disabled = getDisabledDueToDependency(
      allOn({ customerAccounts: false }),
    );
    expect(disabled.has("loyalty")).toBe(true);
    expect(disabled.has("reviews")).toBe(true);
  });

  it("terminates when the registry contains a dependency cycle", () => {
    const a = FEATURE_REGISTRY.products!;
    const original = a.dependsOn;
    try {
      // products -> orders -> products
      a.dependsOn = ["orders"];
      const disabled = getDisabledDueToDependency(allOn({ inventory: false }));
      expect(disabled.has("inventoryRentals")).toBe(true);
      // The cycle itself does not self-disable without an off entry point.
      expect(disabled.has("products")).toBe(false);
      // An off entry point propagates around the loop without hanging.
      const off = getDisabledDueToDependency(allOn({ orders: false }));
      expect(off.has("products")).toBe(true);
    } finally {
      a.dependsOn = original;
    }
  });
});

describe("getBlockingDependencies", () => {
  it("returns [] for a feature with no dependencies", () => {
    expect(getBlockingDependencies("products", allOn())).toEqual([]);
  });

  it("returns [] when all dependencies are on", () => {
    expect(getBlockingDependencies("payments", allOn())).toEqual([]);
  });

  it("returns an explicitly-off direct dependency", () => {
    expect(
      getBlockingDependencies("orders", allOn({ products: false })),
    ).toEqual(["products"]);
  });

  it("includes direct dependencies that are only disabled by dependency", () => {
    // Products off: orders + cart are off by cascade, so payments names both.
    expect(
      getBlockingDependencies("payments", allOn({ products: false })),
    ).toEqual(["orders", "cart"]);
    // Orders off: payments is blocked, so subscriptions names payments only.
    expect(
      getBlockingDependencies("subscriptions", allOn({ orders: false })),
    ).toEqual(["payments"]);
  });

  it("only lists the dependencies that are actually off", () => {
    expect(getBlockingDependencies("payments", allOn({ cart: false }))).toEqual(
      ["cart"],
    );
  });

  it("returns [] for an unknown key", () => {
    expect(getBlockingDependencies("nope", allOn())).toEqual([]);
  });
});

describe("resolveFlags uses transitive resolution", () => {
  it("Products off turns payments, coupons and loyalty off", () => {
    const { isEnabled, disabledByDependency } = resolveFlags({
      ...getDefaultFlags(),
      products: false,
      coupons: true,
      loyalty: true,
    });
    expect(isEnabled("payments")).toBe(false);
    expect(isEnabled("coupons")).toBe(false);
    expect(isEnabled("loyalty")).toBe(false);
    expect(disabledByDependency).toContain("payments");
  });

  it("Orders off keeps cart and coupons enabled", () => {
    const { isEnabled } = resolveFlags({ orders: false, coupons: true });
    expect(isEnabled("orders")).toBe(false);
    expect(isEnabled("payments")).toBe(false);
    expect(isEnabled("cart")).toBe(true);
    expect(isEnabled("coupons")).toBe(true);
  });

  it("defaults leave the default-on commerce features enabled", () => {
    const { isEnabled } = resolveFlags(null);
    for (const key of ["products", "orders", "cart", "checkout", "payments"]) {
      expect(isEnabled(key), key).toBe(true);
    }
  });
});
