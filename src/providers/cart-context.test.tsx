import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartItem, CartItemSnapshot } from "./cart-context";

import { CartProvider, useCart } from "./cart-context";

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
