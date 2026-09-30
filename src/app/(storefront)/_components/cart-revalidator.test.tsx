import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StorefrontFlagsProvider } from "~/providers/feature-flags-context";

import { CartRevalidator } from "./cart-revalidator";

// Capture the options passed to `getCartItemsStatus.useQuery` so the tests can
// assert on `enabled` without a real tRPC client.
const useQuery = vi.fn(
  (_input: unknown, _opts: { enabled?: boolean }) =>
    ({ data: undefined }) as { data: unknown },
);
vi.mock("~/trpc/react", () => ({
  api: {
    product: {
      getCartItemsStatus: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) =>
          useQuery(input, opts),
      },
    },
  },
}));

const reconcile = vi.fn();
let cartItems: { productId: string; variantId: string | null }[] = [];
vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ items: cartItems, isHydrated: true, reconcile }),
}));

function lastEnabled() {
  return useQuery.mock.lastCall?.[1].enabled;
}

describe("CartRevalidator", () => {
  beforeEach(() => {
    useQuery.mockClear();
    reconcile.mockClear();
    cartItems = [{ productId: "prod_1", variantId: null }];
  });

  it("revalidates a non-empty cart when products is on", () => {
    render(
      <StorefrontFlagsProvider flags={{ products: true }}>
        <CartRevalidator />
      </StorefrontFlagsProvider>,
    );
    expect(lastEnabled()).toBe(true);
    expect(useQuery.mock.lastCall?.[0]).toEqual({
      items: [{ productId: "prod_1", variantId: null }],
    });
  });

  it("skips the query and leaves the cart alone when products is off", () => {
    render(
      <StorefrontFlagsProvider flags={{ products: false }}>
        <CartRevalidator />
      </StorefrontFlagsProvider>,
    );
    expect(lastEnabled()).toBe(false);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("skips the query for an empty cart", () => {
    cartItems = [];
    render(
      <StorefrontFlagsProvider flags={{ products: true }}>
        <CartRevalidator />
      </StorefrontFlagsProvider>,
    );
    expect(lastEnabled()).toBe(false);
  });

  it("reconciles when the query returns data", () => {
    const snapshots = [{ productId: "prod_1", variantId: null }];
    useQuery.mockReturnValue({ data: snapshots });
    render(
      <StorefrontFlagsProvider flags={{ products: true }}>
        <CartRevalidator />
      </StorefrontFlagsProvider>,
    );
    expect(reconcile).toHaveBeenCalledWith(snapshots);
  });
});
