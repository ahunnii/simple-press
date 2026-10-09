import { useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartItem, CartItemSnapshot } from "./cart-context";

import { cartItemId, cartLineKey, CartProvider, useCart } from "./cart-context";

// Cart shows toasts via sonner; stub it so tests don't touch the toast portal.
vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    success: () => undefined,
    error: () => undefined,
  }),
}));

const SAMPLE: Omit<CartItem, "quantity"> = {
  productId: "p1",
  variantId: null,
  productName: "Widget",
  variantName: null,
  price: 1500,
  imageUrl: null,
  sku: null,
};

function Harness({ snapshots }: { snapshots?: CartItemSnapshot[] }) {
  const cart = useCart();
  const first = cart.items[0];
  return (
    <div>
      <span data-testid="count">{cart.itemCount}</span>
      <span data-testid="subtotal">{cart.subtotal}</span>
      <span data-testid="slug">{first?.productSlug ?? "none"}</span>
      <button onClick={() => cart.addItem(SAMPLE)}>add</button>
      <button onClick={() => cart.removeItem("p1", null)}>remove</button>
      <button onClick={() => cart.clearCart()}>clear</button>
      {snapshots && (
        <button onClick={() => cart.reconcile(snapshots)}>reconcile</button>
      )}
    </div>
  );
}

const CART_KEY = "shopping-cart";

function renderCart(snapshots?: CartItemSnapshot[]) {
  return render(
    <CartProvider>
      <Harness snapshots={snapshots} />
    </CartProvider>,
  );
}

describe("CartProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    renderCart();
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("subtotal").textContent).toBe("0");
  });

  it("adds an item and accumulates quantity + subtotal", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText("add"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("subtotal").textContent).toBe("1500");

    await user.click(screen.getByText("add"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("subtotal").textContent).toBe("3000");
  });

  it("persists the cart to localStorage", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText("add"));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as
        | CartItem[]
        | [];
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ productId: "p1", quantity: 1 });
    });
  });

  it("removes and clears items", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText("add"));
    expect(screen.getByTestId("count").textContent).toBe("1");

    await user.click(screen.getByText("remove"));
    expect(screen.getByTestId("count").textContent).toBe("0");

    await user.click(screen.getByText("add"));
    await user.click(screen.getByText("clear"));
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("clearCart removes the persisted cart from localStorage", async () => {
    const user = userEvent.setup();
    const removeItemSpy = vi.spyOn(window.localStorage, "removeItem");
    renderCart();

    await user.click(screen.getByText("add"));
    await waitFor(() => {
      expect(localStorage.getItem(CART_KEY)).not.toBeNull();
    });

    await user.click(screen.getByText("clear"));

    // Regression: clearCart must remove the storage key outright (not just
    // rely on the save effect eventually persisting an empty array) —
    // otherwise a remounted provider (e.g. a fresh order-confirmation page
    // load) can read stale data mid-hydration before the save effect ever
    // runs. The save effect legitimately re-persists "[]" afterwards, so we
    // assert on the removeItem call itself rather than the final key state.
    expect(removeItemSpy).toHaveBeenCalledWith(CART_KEY);

    removeItemSpy.mockRestore();
  });

  it("clearing the cart from a child's mount effect prevents the hydration effect from resurrecting it", async () => {
    // Reproduces the order-confirmation-page race: a purchased cart is still
    // in localStorage from before checkout, and on the fresh page load a
    // *child* component calls clearCart() inside its own mount effect.
    // Child effects fire before parent effects, so this runs before
    // CartProvider's hydration effect below. Without removing the storage
    // key synchronously, the hydration effect would still find the old cart
    // and resurrect it via setItems(saved).
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ ...SAMPLE, quantity: 2 }]),
    );

    function ClearOnMountHarness() {
      const cart = useCart();
      useEffect(() => {
        cart.clearCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <span data-testid="count">{cart.itemCount}</span>;
    }

    render(
      <CartProvider>
        <ClearOnMountHarness />
      </CartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    // Let the hydration + save effects fully settle and confirm the cart
    // stays cleared instead of being resurrected a tick later.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("hydrates an existing cart from localStorage on mount", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ ...SAMPLE, quantity: 3 }]),
    );

    renderCart();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("3");
      expect(screen.getByTestId("subtotal").textContent).toBe("4500");
    });
  });

  it("reconcile backfills productSlug from the snapshot slug", async () => {
    const user = userEvent.setup();
    // Old saved cart — no productSlug on the item
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ ...SAMPLE, quantity: 1 }]),
    );

    const snapshots: CartItemSnapshot[] = [
      {
        productId: "p1",
        variantId: null,
        available: true,
        price: 1500,
        compareAtPrice: null,
        maxQuantity: null,
        slug: "widget-slug",
      },
    ];

    renderCart(snapshots);

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
    expect(screen.getByTestId("slug").textContent).toBe("none");

    await user.click(screen.getByText("reconcile"));

    await waitFor(() =>
      expect(screen.getByTestId("slug").textContent).toBe("widget-slug"),
    );
    // Item is preserved, not dropped
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("reconcile keeps an item without productSlug when the snapshot has no slug", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ ...SAMPLE, quantity: 2 }]),
    );

    // Snapshot omits slug (undefined)
    const snapshots: CartItemSnapshot[] = [
      {
        productId: "p1",
        variantId: null,
        available: true,
        price: 1500,
        compareAtPrice: null,
        maxQuantity: null,
      },
    ];

    renderCart(snapshots);

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2"),
    );

    await user.click(screen.getByText("reconcile"));

    // Reconciles cleanly: item stays, no slug backfilled
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2"),
    );
    expect(screen.getByTestId("slug").textContent).toBe("none");
  });
});

describe("CartProvider add-on lines (addOnFor)", () => {
  const GLOVE: Omit<CartItem, "quantity"> = {
    ...SAMPLE,
    productId: "glove",
    variantId: "g-purple",
    productName: "Glove",
  };
  const CHAIN: Omit<CartItem, "quantity"> = {
    ...SAMPLE,
    productId: "chain",
    productName: "Chain",
    price: 2500,
  };
  const KEY_A = cartLineKey("glove", "g-purple");
  const KEY_B = cartLineKey("glove", "g-black");

  let cart: ReturnType<typeof useCart>;
  function Capture() {
    cart = useCart();
    return null;
  }

  async function renderCapture() {
    render(
      <CartProvider>
        <Capture />
      </CartProvider>,
    );
    await waitFor(() => expect(cart.isHydrated).toBe(true));
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the same chain picked for two gloves as two lines", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(GLOVE);
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
      cart.addItem({ ...GLOVE, variantId: "g-black" });
      cart.addItem({ ...CHAIN, addOnFor: KEY_B });
    });

    const chains = cart.items.filter((i) => i.productId === "chain");
    expect(chains).toHaveLength(2);
    expect(chains.map((c) => c.addOnFor)).toEqual([KEY_A, KEY_B]);
  });

  it("merges a repeat add of the same add-on for the same glove", async () => {
    await renderCapture();
    act(() => {
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
      cart.addItem({ ...CHAIN, addOnFor: KEY_A }, 2);
    });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(3);
  });

  it("keeps a standalone line apart from an add-on line of the same product", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(CHAIN);
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
    });
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]?.addOnFor).toBeUndefined();
  });

  it("scopes isInCart / getItemQuantity, summing every line when unscoped", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(CHAIN);
      cart.addItem({ ...CHAIN, addOnFor: KEY_A }, 2);
    });
    expect(cart.getItemQuantity("chain", null)).toBe(3);
    expect(cart.getItemQuantity("chain", null, null)).toBe(1);
    expect(cart.getItemQuantity("chain", null, KEY_A)).toBe(2);
    expect(cart.getItemQuantity("chain", null, KEY_B)).toBe(0);
    expect(cart.isInCart("chain", null, KEY_A)).toBe(true);
    expect(cart.isInCart("chain", null, KEY_B)).toBe(false);
  });

  it("removes and updates only the targeted line when scoped", async () => {
    await renderCapture();
    act(() => {
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
      cart.addItem({ ...CHAIN, addOnFor: KEY_B });
    });

    act(() => cart.updateQuantity("chain", null, 4, KEY_B));
    expect(cart.getItemQuantity("chain", null, KEY_A)).toBe(1);
    expect(cart.getItemQuantity("chain", null, KEY_B)).toBe(4);

    act(() => cart.removeItem("chain", null, KEY_A));
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.addOnFor).toBe(KEY_B);
  });

  it("unscoped removeItem drops every line of the product (checkout cleanup)", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(CHAIN);
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
      cart.addItem(GLOVE);
    });
    act(() => cart.removeItem("chain", null));
    expect(cart.items.map((i) => i.productId)).toEqual(["glove"]);
  });

  it("removeItemWithAddOns removes a glove and only its own add-ons", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(GLOVE);
      cart.addItem({ ...CHAIN, addOnFor: KEY_A });
      cart.addItem({ ...GLOVE, variantId: "g-black" });
      cart.addItem({ ...CHAIN, addOnFor: KEY_B });
      cart.addItem(CHAIN);
    });
    act(() => cart.removeItemWithAddOns("glove", "g-purple"));
    expect(cart.items.map(cartItemId)).toEqual([
      cartLineKey("glove", "g-black"),
      `${cartLineKey("chain", null)}@${KEY_B}`,
      cartLineKey("chain", null),
    ]);
  });

  it("checks stock against every line of the product", async () => {
    await renderCapture();
    const limited = { ...CHAIN, maxInventory: 3 };
    act(() => {
      cart.addItem({ ...limited, addOnFor: KEY_A }, 2);
      cart.addItem({ ...limited, addOnFor: KEY_B }, 2); // 4 > 3: rejected
    });
    expect(cart.items).toHaveLength(1);

    act(() => cart.addItem({ ...limited, addOnFor: KEY_B }, 1));
    expect(cart.getItemQuantity("chain", null)).toBe(3);

    act(() => cart.updateQuantity("chain", null, 2, KEY_B)); // 2 + 2 > 3
    expect(cart.getItemQuantity("chain", null, KEY_B)).toBe(1);
  });

  it("restores addOnFor from a saved cart and drops a malformed one", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { ...CHAIN, quantity: 1, addOnFor: KEY_A },
        { ...CHAIN, productId: "bad", quantity: 1, addOnFor: 7 },
      ]),
    );
    await renderCapture();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.addOnFor).toBe(KEY_A);
  });
});
