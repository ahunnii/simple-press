import { useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartItem, CartItemSnapshot } from "./cart-context";
import { configKey } from "~/lib/customizer";

import {
  cartItemId,
  cartLineKey,
  CartProvider,
  checkoutLineKey,
  parseStoredCartItems,
  useCart,
} from "./cart-context";

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

  it("unscoped removeItem drops every plain line of the product", async () => {
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

describe("CartProvider configured lines (product customizer)", () => {
  const GLOVE: Omit<CartItem, "quantity"> = {
    ...SAMPLE,
    productId: "glove",
    variantId: "g-purple",
    productName: "Glove",
    price: 4000,
  };
  const HEART = {
    choices: [{ groupId: "charms", valueIds: ["heart"] }],
    texts: [],
  };
  const STAR = {
    choices: [{ groupId: "charms", valueIds: ["star"] }],
    texts: [{ groupId: "engraving", text: "Amy" }],
  };
  const custom = (summary: string) => ({
    summary,
    lines: [{ label: "Charms", value: summary, price: 500 }],
  });
  const heartLine = {
    ...GLOVE,
    price: 4500,
    configuration: HEART,
    customization: custom("Heart"),
  };
  const starLine = {
    ...GLOVE,
    price: 5000,
    configuration: STAR,
    customization: custom("Star"),
  };

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

  it("puts the config key in the line id; a plain line's id is unchanged", () => {
    expect(cartItemId(GLOVE)).toBe("glove:g-purple");
    expect(cartItemId({ ...GLOVE, configuration: HEART })).toBe(
      `glove:g-purple~${configKey(HEART)}`,
    );
    // An empty configuration is a plain line.
    expect(
      cartItemId({ ...GLOVE, configuration: { choices: [], texts: [] } }),
    ).toBe("glove:g-purple");
  });

  it("keeps two builds of one variant apart and merges a repeat of the same build", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(starLine);
      cart.addItem(GLOVE);
      // Same build, ids in another order + untrimmed text: same identity.
      cart.addItem(
        {
          ...starLine,
          configuration: {
            texts: [{ groupId: "engraving", text: "  Amy " }],
            choices: [{ groupId: "charms", valueIds: ["star", "star"] }],
          },
        },
        2,
      );
    });
    expect(cart.items).toHaveLength(3);
    const star = cart.items.find((i) => i.configKey === configKey(STAR));
    expect(star?.quantity).toBe(3);
    expect(star?.configuration).toEqual(STAR);
    expect(cart.items.find((i) => !i.configKey)?.quantity).toBe(1);
    expect(cart.subtotal).toBe(4500 + 3 * 5000 + 4000);
  });

  it("recomputes configKey instead of trusting the caller", async () => {
    await renderCapture();
    act(() => cart.addItem({ ...heartLine, configKey: "forged" }));
    expect(cart.items[0]?.configKey).toBe(configKey(HEART));
  });

  it("removeLine / updateLineQuantity change only the targeted line", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(starLine);
      cart.addItem(GLOVE);
    });
    const heartId = cartItemId(cart.items[0]!);
    const starId = cartItemId(cart.items[1]!);

    act(() => cart.updateLineQuantity(starId, 4));
    expect(cart.items.map((i) => i.quantity)).toEqual([1, 4, 1]);

    act(() => cart.removeLine(heartId));
    expect(cart.items.map(cartItemId)).toEqual([starId, "glove:g-purple"]);

    act(() => cart.updateLineQuantity(starId, 0));
    expect(cart.items.map(cartItemId)).toEqual(["glove:g-purple"]);
  });

  it("updateLineQuantity respects stock shared with the variant's other lines", async () => {
    await renderCapture();
    act(() => {
      cart.addItem({ ...heartLine, maxInventory: 3 }, 2);
      cart.addItem({ ...GLOVE, maxInventory: 3 }, 1);
    });
    const heartId = cartItemId(cart.items[0]!);
    act(() => cart.updateLineQuantity(heartId, 3)); // 3 + 1 > 3
    expect(cart.items[0]?.quantity).toBe(2);
    act(() => cart.updateLineQuantity(heartId, 1)); // lowering always works
    expect(cart.items[0]?.quantity).toBe(1);
  });

  it("legacy product+variant mutators never touch configured lines", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(GLOVE);
    });

    act(() => cart.updateQuantity("glove", "g-purple", 5));
    act(() => cart.incrementItem("glove", "g-purple"));
    expect(cart.items.map((i) => i.quantity)).toEqual([1, 6]);

    act(() => cart.decrementItem("glove", "g-purple", null));
    expect(cart.items.map((i) => i.quantity)).toEqual([1, 5]);

    act(() => cart.removeItem("glove", "g-purple"));
    act(() => cart.removeItemWithAddOns("glove", "g-purple"));
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.configKey).toBe(configKey(HEART));

    // A configured line is invisible to null/string scopes too.
    act(() => cart.updateQuantity("glove", "g-purple", 0, null));
    expect(cart.items).toHaveLength(1);
  });

  it("stock reads count configured lines; scoped reads see plain lines only", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine, 2);
      cart.addItem(GLOVE);
    });
    expect(cart.getItemQuantity("glove", "g-purple")).toBe(3);
    expect(cart.getItemQuantity("glove", "g-purple", null)).toBe(1);
    expect(cart.isInCart("glove", "g-purple")).toBe(true);
  });

  it("reconciles each line against its own snapshot", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(starLine);
      cart.addItem(GLOVE);
    });
    const snap = (configKeyValue: string, price: number, available = true) => ({
      productId: "glove",
      variantId: "g-purple",
      configKey: configKeyValue,
      available,
      price,
      compareAtPrice: null,
      maxQuantity: null,
    });
    act(() =>
      cart.reconcile([
        snap(configKey(HEART), 4600),
        snap(configKey(STAR), 0, false),
        snap("", 4100),
      ]),
    );
    expect(
      cart.items.map((i) => [i.configKey ?? "", i.price] as const),
    ).toEqual([
      [configKey(HEART), 4600],
      ["", 4100],
    ]);
  });

  it("replaces a configured line's breakdown with the server's, keeping a plain line plain", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(GLOVE);
    });
    const fresh = {
      summary: "Charms: Heart",
      lines: [{ label: "Charms", value: "Heart", price: 800 }],
    };
    const snap = (key: string, price: number, extra = {}) => ({
      productId: "glove",
      variantId: "g-purple",
      configKey: key,
      available: true,
      price,
      compareAtPrice: null,
      maxQuantity: null,
      ...extra,
    });
    act(() =>
      cart.reconcile([
        snap(configKey(HEART), 4800, { customization: fresh }),
        // A stray customization on a plain snapshot must not attach.
        snap("", 4000, { customization: fresh }),
      ]),
    );
    const configured = cart.items.find((i) => i.configKey);
    expect(configured).toMatchObject({ price: 4800, customization: fresh });
    expect(cart.items.find((i) => !i.configKey)?.customization).toBeUndefined();
  });

  it("keeps the stored breakdown when the snapshot has none or reads the same", async () => {
    await renderCapture();
    act(() => cart.addItem(heartLine));
    const before = cart.items[0]!.customization;
    const snap = {
      productId: "glove",
      variantId: "g-purple",
      configKey: configKey(HEART),
      available: true,
      price: 4500,
      compareAtPrice: null,
      maxQuantity: null,
    };
    act(() => cart.reconcile([snap]));
    expect(cart.items[0]!.customization).toBe(before);
    const itemsBefore = cart.items;
    act(() =>
      cart.reconcile([
        { ...snap, customization: structuredClone(custom("Heart")) },
      ]),
    );
    // Equal content: same line objects, no needless re-render.
    expect(cart.items).toBe(itemsBefore);
  });

  it("drops a configured line whose snapshot is missing (plain snapshot only)", async () => {
    await renderCapture();
    act(() => {
      cart.addItem(heartLine);
      cart.addItem(GLOVE);
    });
    act(() =>
      cart.reconcile([
        {
          productId: "glove",
          variantId: "g-purple",
          available: true,
          price: 4000,
          compareAtPrice: null,
          maxQuantity: null,
        },
      ]),
    );
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.configKey).toBeUndefined();
  });

  it("restores configured lines from storage and recomputes their key", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ ...heartLine, quantity: 2, configKey: "stale" }]),
    );
    await renderCapture();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      quantity: 2,
      configKey: configKey(HEART),
      customization: custom("Heart"),
    });
  });
});

describe("checkoutLineKey", () => {
  // The pre-refactor hash, kept inline: lineKeys already in flight and carts
  // in localStorage must keep matching.
  const fnv1a = (input: string, seed: number) => {
    let hash = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };

  it("is the line id when it fits the 64-char cap", () => {
    const item = { productId: "p1", variantId: "v1" };
    expect(checkoutLineKey(item)).toBe(cartItemId(item));
  });

  it("hashes a long id byte-identically to the original algorithm", () => {
    const item = {
      productId: "clxproduct0000000000000001",
      variantId: "clxvariant00000000000000001",
      configuration: {
        choices: [{ groupId: "charms", valueIds: ["star"] }],
        texts: [],
      },
    };
    const id = cartItemId(item);
    expect(id.length).toBeGreaterThan(64);
    expect(checkoutLineKey(item)).toBe(
      `h:${fnv1a(id, 0x811c9dc5)}${fnv1a(id, 0x050c5d1f)}`,
    );
    expect(checkoutLineKey(item)).toMatch(/^h:[0-9a-f]{16}$/);
  });
});

describe("parseStoredCartItems", () => {
  const line = {
    ...SAMPLE,
    quantity: 1,
  };
  const config = {
    choices: [{ groupId: "charms", valueIds: ["heart"] }],
    texts: [],
  };

  it("drops a line with a malformed configuration instead of selling it plain", () => {
    const parsed = parseStoredCartItems(
      JSON.stringify([
        { ...line, configuration: { choices: "heart" } },
        { ...line, productId: "ok" },
      ]),
    );
    expect(parsed?.map((i) => i.productId)).toEqual(["ok"]);
  });

  it("drops a configured line with a malformed customization", () => {
    const parsed = parseStoredCartItems(
      JSON.stringify([
        {
          ...line,
          configuration: config,
          customization: { summary: 3, lines: [] },
        },
      ]),
    );
    expect(parsed).toEqual([]);
  });

  it("turns an empty configuration into a plain line and strips stray fields", () => {
    const parsed = parseStoredCartItems(
      JSON.stringify([
        { ...line, configuration: { choices: [], texts: [] }, configKey: "x" },
        { ...line, productId: "p2", configKey: "y", customization: {} },
      ]),
    );
    expect(parsed).toHaveLength(2);
    for (const item of parsed ?? []) {
      expect(item).not.toHaveProperty("configuration");
      expect(item).not.toHaveProperty("configKey");
      expect(item).not.toHaveProperty("customization");
    }
  });
});
