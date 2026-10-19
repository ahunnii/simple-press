import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OliveVariantSelector } from "./olive-variant-selector";

/**
 * `useCart` needs a real `CartProvider` (it throws outside one) — mocked
 * directly since this test never asserts on cart state, only on the
 * quantity this selector reports back to its parent. `useVariantImage` is
 * tolerant of a missing provider on its own, so it needs no mock.
 */
const addItem = vi.fn();
vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ addItem }),
}));

// This selector renders `NotifyMeForm`, which pulls in `~/trpc/react` and,
// transitively, the real server router/db client — mock it directly like
// every other test that touches a component importing that form (see
// `src/app/(storefront)/subscribe/_components/subscribe-form.test.tsx`).
vi.mock("~/trpc/react", () => ({
  api: {
    backInStock: {
      subscribe: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
          isError: false,
        }),
      },
    },
  },
}));

type FakeProduct = Parameters<typeof OliveVariantSelector>[0]["product"];

function makeProduct(): FakeProduct {
  return {
    id: "prod_1",
    slug: "candle",
    name: "Candle",
    price: 2000,
    compareAtPrice: null,
    images: [],
    trackInventory: false,
    allowBackorders: false,
    variants: [
      {
        id: "var_1",
        name: "Lavender",
        price: null,
        compareAtPrice: null,
        imageUrl: null,
        sku: "SKU-1",
        inventoryQty: 10,
        options: { scent: "Lavender" },
      },
      {
        id: "var_2",
        name: "Cedar",
        price: null,
        compareAtPrice: null,
        imageUrl: null,
        sku: "SKU-2",
        inventoryQty: 10,
        options: { scent: "Cedar" },
      },
    ],
  } as unknown as FakeProduct;
}

describe("OliveVariantSelector", () => {
  it("reports the shopper's chosen quantity to the parent via onQuantityChange", () => {
    const onQuantityChange = vi.fn();
    const setSelectedVariantId = vi.fn();

    render(
      <OliveVariantSelector
        product={makeProduct()}
        selectedVariantId="var_1"
        setSelectedVariantId={setSelectedVariantId}
        onQuantityChange={onQuantityChange}
      />,
    );

    // Mount fires the sync effect once with the initial quantity.
    expect(onQuantityChange).toHaveBeenLastCalledWith(1);

    const increment = screen.getByLabelText(/Increase quantity/);
    fireEvent.click(increment);
    fireEvent.click(increment);

    expect(onQuantityChange).toHaveBeenLastCalledWith(3);
  });

  it("does not require an onQuantityChange callback", () => {
    expect(() =>
      render(
        <OliveVariantSelector
          product={makeProduct()}
          selectedVariantId="var_1"
          setSelectedVariantId={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it("paints an owner-pinned hex for a color chip", () => {
    const product = makeProduct();
    (product as unknown as { variants: unknown[] }).variants = [
      {
        id: "var_1",
        name: "Hunter Green",
        price: null,
        compareAtPrice: null,
        imageUrl: null,
        sku: "SKU-1",
        inventoryQty: 10,
        options: { color: "Hunter Green" },
      },
      {
        id: "var_2",
        name: "Green",
        price: null,
        compareAtPrice: null,
        imageUrl: null,
        sku: "SKU-2",
        inventoryQty: 10,
        options: { color: "Green" },
      },
    ];
    (product as unknown as { additionalFields: unknown }).additionalFields = {
      colorSwatches: { "Hunter Green": "#355e3b" },
    };

    const { container } = render(
      <OliveVariantSelector
        product={product}
        selectedVariantId="var_1"
        setSelectedVariantId={vi.fn()}
      />,
    );

    const painted = Array.from(
      container.querySelectorAll<HTMLElement>("[style]"),
    ).map((node) => node.style.backgroundColor);
    expect(painted).toContain("#355e3b");
  });
});
