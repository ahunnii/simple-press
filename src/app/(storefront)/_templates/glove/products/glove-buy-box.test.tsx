import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOnCopy } from "./glove-customizer";
import type { PublicCustomizerDefinition } from "~/lib/customizer";
import type * as CartContext from "~/providers/cart-context";
import { toPublicCustomizerDefinition } from "~/lib/customizer";
import { choiceGroup, definition, value } from "~/lib/customizer/test-fixtures";

import { GloveBuyBox } from "./glove-buy-box";

// ---- mocks ---------------------------------------------------------------

const addItem = vi.fn<(item: Record<string, unknown>, qty?: number) => void>();
const setIsOpen = vi.fn();

vi.mock("~/providers/cart-context", async (importOriginal) => ({
  ...(await importOriginal<typeof CartContext>()),
  useCart: () => ({
    addItem,
    setIsOpen,
    getItemQuantity: () => 0,
    isHydrated: true,
  }),
}));
vi.mock(
  "~/app/(storefront)/_components/product-page/variant-image-context",
  () => ({ useVariantImage: () => ({ setVariantImageUrl: vi.fn() }) }),
);
vi.mock("~/app/(storefront)/_components/product/notify-me-form", () => ({
  NotifyMeForm: () => null,
}));
vi.mock("~/app/(storefront)/_components/product/subscribe-panel", () => ({
  SubscribePanel: () => null,
}));
vi.mock("~/app/(storefront)/_components/wishlist/wishlist-button", () => ({
  WishlistButton: () => null,
}));
vi.mock("./glove-variant-selector", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "./glove-variant-selector",
  );
  // Keep the real label (the options panel uses it); the grid isn't under test.
  return { ...actual, GloveVariantSelector: () => null };
});
vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(props as Record<string, string>)} />
  ),
}));

// ---- fixtures ------------------------------------------------------------

const copy: GloveAddOnCopy = {
  heading: "Complete your LuvGluv",
  helper: "Pick a chain and up to three charms.",
  chainLabel: "Chain",
  noChainLabel: "No chain",
  charmsLabel: "Charms",
  gloveLine: "Glove",
  charmLine: "Charm",
  totalLine: "Total",
};

const GLOVE_PRICE = 4000;

/**
 * The migrated LuvGluv: Chain (pick 1) and Charms (1-3). Required for the
 * blocking tests, optional for the price tests.
 */
function gloveOptions(required = false): PublicCustomizerDefinition {
  return toPublicCustomizerDefinition(
    definition([
      choiceGroup(
        "chain",
        [
          value("gold", { label: "Gold Chain", priceDelta: 1500 }),
          value("silver", { label: "Silver Chain", priceDelta: 2000 }),
        ],
        {
          name: "Chain",
          maxSelections: 1,
          required,
          minSelections: required ? 1 : 0,
        },
      ),
      choiceGroup(
        "charms",
        [
          value("star", { label: "Star Charm", priceDelta: 500 }),
          value("heart", { label: "Heart Charm", priceDelta: 600 }),
          value("moon", { label: "Moon Charm", priceDelta: 700 }),
        ],
        {
          name: "Charms",
          maxSelections: 3,
          required,
          minSelections: required ? 1 : 0,
        },
      ),
    ]),
  );
}

type Product = DefaultProductPageTemplateProps["product"];

const variantProduct = {
  id: "glove-1",
  slug: "luvgluv",
  name: "LuvGluv",
  price: GLOVE_PRICE,
  compareAtPrice: null,
  sku: "LG-1",
  images: [{ url: "/glove.png" }],
  trackInventory: true,
  allowBackorders: false,
  inventoryQty: 0,
  baseInventoryUnit: null,
  baseUnitsConsumed: null,
  additionalFields: null,
  customizer: null,
  variants: [
    {
      id: "glove-v-m",
      name: "Navy / M",
      price: null,
      compareAtPrice: null,
      inventoryQty: 5,
      imageUrl: null,
      sku: "LG-NAVY-M",
      options: { Color: "Navy", Size: "M" },
    },
  ],
} as unknown as Product;

const plainProduct = {
  ...variantProduct,
  id: "glove-2",
  slug: "plain-glove",
  name: "Plain Glove",
  variants: [],
  inventoryQty: 5,
} as unknown as Product;

function renderBuyBox({
  product = variantProduct,
  customizer = gloveOptions(),
  cartEnabled = true,
  categories = [],
}: {
  product?: Product;
  customizer?: PublicCustomizerDefinition | null;
  cartEnabled?: boolean;
  categories?: { name: string; slug: string }[];
} = {}) {
  return render(
    <GloveBuyBox
      product={{ ...product, customizer } as Product}
      numbered
      intro={null}
      categories={categories}
      linkCategories={false}
      cartEnabled={cartEnabled}
      copy={{
        addToCart: "ADD TO CART",
        unavailable: "Unavailable",
        notify: "Notify me",
        comingSoonHeading: "Coming soon",
        comingSoonBody: "",
        addOns: copy,
      }}
    />,
  );
}

const addToCart = () => screen.getByRole("button", { name: "ADD TO CART" });
const barButton = () =>
  screen.getAllByRole("button", { name: "ADD TO CART", hidden: true })[1]!;
const chip = (name: RegExp) =>
  screen.getByRole(/chain/i.test(String(name)) ? "radio" : "checkbox", {
    name,
  });

beforeEach(() => {
  addItem.mockClear();
  setIsOpen.mockClear();
});

// ---- required option groups ----------------------------------------------

describe("GloveBuyBox - required option groups", () => {
  it("blocks Add to Cart with a line naming each missing pick", () => {
    renderBuyBox({ customizer: gloveOptions(true) });
    const reason = document.getElementById("glove-atc-options");
    expect(reason).toHaveTextContent("Choose your chain. Choose your charms.");
    expect(addToCart()).toHaveAttribute("aria-disabled", "true");
    expect(addToCart()).toHaveAttribute(
      "aria-describedby",
      "glove-atc-options",
    );
    // Not a live region: the groups' own alerts announce after an attempt.
    expect(reason).not.toHaveAttribute("aria-live");
    expect(reason).not.toHaveAttribute("role");
  });

  it("does not add on click, shows the group errors and turns the line into an error", () => {
    renderBuyBox({ customizer: gloveOptions(true) });
    const reason = document.getElementById("glove-atc-options")!;
    expect(reason).not.toHaveClass("glove-error");
    fireEvent.click(addToCart());
    expect(addItem).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(reason).toHaveClass("glove-error");
  });

  it("names only what is still missing, then unblocks and adds one configured line", () => {
    renderBuyBox({ customizer: gloveOptions(true) });
    fireEvent.click(chip(/gold chain/i));
    expect(document.getElementById("glove-atc-options")).toHaveTextContent(
      /^Choose your charms\.$/,
    );
    fireEvent.click(chip(/star charm/i));
    expect(document.getElementById("glove-atc-options")).toBeNull();
    expect(addToCart()).not.toHaveAttribute("aria-disabled");
    expect(addToCart()).not.toHaveAttribute("aria-describedby");
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(1);
    const [line] = addItem.mock.calls[0]!;
    expect(line).toMatchObject({
      productId: "glove-1",
      variantId: "glove-v-m",
      price: GLOVE_PRICE + 1500 + 500,
    });
    expect(line).not.toHaveProperty("addOnFor");
  });

  it("gives the mobile bar's button the same rule", () => {
    renderBuyBox({ customizer: gloveOptions(true) });
    expect(barButton()).toHaveAttribute("aria-disabled", "true");
    expect(barButton()).toHaveAttribute(
      "aria-describedby",
      "glove-atc-options",
    );
    fireEvent.click(barButton());
    expect(addItem).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    fireEvent.click(chip(/gold chain/i));
    fireEvent.click(chip(/star charm/i));
    expect(barButton()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(barButton());
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it("leaves optional groups unblocked", () => {
    renderBuyBox({ customizer: gloveOptions(false) });
    expect(document.getElementById("glove-atc-options")).toBeNull();
    expect(addToCart()).not.toHaveAttribute("aria-disabled");
  });

  it("numbers the option groups after the variant rows (Color, Size, then Chain, Charms)", () => {
    renderBuyBox({ customizer: gloveOptions(true) });
    const steps = Array.from(document.querySelectorAll(".glove-medallion")).map(
      (el) => el.textContent.replace("Step", "").trim(),
    );
    expect(steps).toEqual(["3", "4"]);
  });
});

// ---- catalog mode --------------------------------------------------------

describe("GloveBuyBox - catalog mode (cart off)", () => {
  it("hides Add to Cart, the qty stepper and the options panel", () => {
    renderBuyBox({ cartEnabled: false });
    expect(
      screen.queryByRole("button", { name: "ADD TO CART" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Quantity" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(copy.heading)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(addItem).not.toHaveBeenCalled();
  });

  it("keeps the price, with no share row", () => {
    renderBuyBox({ cartEnabled: false, product: plainProduct });
    expect(screen.queryByText(/share/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
  });

  it("shows the purchase UI again when cart is on", () => {
    renderBuyBox({ cartEnabled: true });
    expect(addToCart()).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Quantity" })).toBeInTheDocument();
  });
});

// ---- meta line -----------------------------------------------------------

describe("GloveBuyBox - meta line", () => {
  it("shows category and SKU on one muted line", () => {
    renderBuyBox({ categories: [{ name: "Gloves", slug: "gloves" }] });
    expect(screen.getByText(/Category:/)).toHaveTextContent(
      /Category: Gloves · SKU LG-/,
    );
  });

  it("drops the separator when there is no category", () => {
    renderBuyBox();
    expect(screen.getByText(/SKU LG-/)).not.toHaveTextContent("·");
    expect(screen.queryByText(/Category/)).not.toBeInTheDocument();
  });
});

// ---- mobile buy bar ------------------------------------------------------

describe("GloveBuyBox - mobile buy bar", () => {
  type Entry = { isIntersecting: boolean; boundingClientRect: { top: number } };
  let observers: {
    callback: (entries: Entry[]) => void;
    options?: IntersectionObserverInit;
    targets: Element[];
  }[] = [];

  beforeEach(() => {
    observers = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private record;
        constructor(
          callback: (entries: Entry[]) => void,
          options?: IntersectionObserverInit,
        ) {
          this.record = { callback, options, targets: [] as Element[] };
          observers.push(this.record);
        }
        observe(target: Element) {
          this.record.targets.push(target);
        }
        disconnect() {
          this.record.targets = [];
        }
        unobserve() {
          return undefined;
        }
        takeRecords() {
          return [];
        }
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const bar = () => {
    const el = barButton().closest("[aria-hidden]");
    if (!el) throw new Error("no buy bar");
    return el;
  };
  const fire = (entries: Entry[]) =>
    act(() => observers.at(-1)!.callback(entries));

  it("observes one sentinel with an open-ended bottom margin", () => {
    renderBuyBox();
    expect(observers).toHaveLength(1);
    expect(observers[0]!.targets).toHaveLength(1);
    expect(observers[0]!.options?.rootMargin).toMatch(/^0px 0px \d{6,}px 0px$/);
    expect(bar()).toHaveAttribute("aria-hidden", "true");
  });

  it("shows once the button is above the viewport and hides when it is back", () => {
    renderBuyBox();
    fire([{ isIntersecting: false, boundingClientRect: { top: -120 } }]);
    expect(bar()).toHaveAttribute("aria-hidden", "false");
    fire([{ isIntersecting: true, boundingClientRect: { top: 200 } }]);
    expect(bar()).toHaveAttribute("aria-hidden", "true");
  });

  it("reads the newest entry when a callback batches several", () => {
    renderBuyBox();
    fire([
      { isIntersecting: true, boundingClientRect: { top: 300 } },
      { isIntersecting: false, boundingClientRect: { top: -900 } },
    ]);
    expect(bar()).toHaveAttribute("aria-hidden", "false");
  });

  it("stays hidden for a sentinel that is not intersecting below the viewport", () => {
    renderBuyBox();
    fire([{ isIntersecting: false, boundingClientRect: { top: 2000 } }]);
    expect(bar()).toHaveAttribute("aria-hidden", "true");
  });
});

// ---- one price -----------------------------------------------------------

describe("GloveBuyBox - one price", () => {
  const rangeProduct = {
    ...variantProduct,
    id: "glove-3",
    slug: "range-glove",
    variants: [
      ...variantProduct.variants,
      {
        id: "glove-v-l",
        name: "Navy / L",
        price: 5000,
        compareAtPrice: null,
        inventoryQty: 5,
        imageUrl: null,
        sku: "LG-NAVY-L",
        options: { Color: "Navy", Size: "L" },
      },
    ],
  } as unknown as Product;

  /** The price paragraph above the intro (first <p> in the buy column). */
  const mainPrice = () =>
    document.querySelector<HTMLElement>(".flex.flex-col.gap-6 > p")!;
  const bar = () => barButton().closest("[aria-hidden]")!;

  it("shows only the glove price with nothing chosen", () => {
    renderBuyBox();
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
    expect(bar()).not.toHaveTextContent("Glove");
  });

  it("swaps in the options total, with the glove price beneath, in the main spot and the buy bar", () => {
    renderBuyBox();
    fireEvent.click(chip(/star charm/i)); // +$5.00
    expect(mainPrice()).toHaveTextContent("$45.00");
    expect(mainPrice()).toHaveTextContent("Glove $40.00");
    expect(bar()).toHaveTextContent("$45.00");
    expect(bar()).toHaveTextContent("Glove $40.00");
    // The panel's itemised line says the same number.
    expect(screen.getByText(/Total \$45\.00/)).toBeInTheDocument();
  });

  it("adds the chain and every charm, and goes back when they are cleared", () => {
    renderBuyBox();
    fireEvent.click(chip(/gold chain/i)); // +$15.00
    fireEvent.click(chip(/star charm/i)); // +$5.00
    fireEvent.click(chip(/heart charm/i)); // +$6.00
    expect(mainPrice()).toHaveTextContent("$66.00");
    fireEvent.click(chip(/no chain/i));
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
  });

  it("multiplies by quantity like the panel", () => {
    renderBuyBox();
    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    fireEvent.click(chip(/star charm/i));
    // 2 × $40.00 + 2 × $5.00
    expect(mainPrice()).toHaveTextContent("$90.00");
    expect(mainPrice()).toHaveTextContent("Glove $80.00");
  });

  it("is not a live region (the panel's total is the one announcement)", () => {
    renderBuyBox();
    fireEvent.click(chip(/star charm/i));
    expect(mainPrice().closest("[aria-live]")).toBeNull();
    expect(mainPrice().querySelector("[aria-live]")).toBeNull();
  });

  it("keeps the variant range on top and totals the selected option beside Add to Cart", () => {
    renderBuyBox({ product: rangeProduct });
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).toHaveTextContent("$50.00");
    fireEvent.click(chip(/star charm/i));
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).toHaveTextContent("$50.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
    const selected = screen.getByText(/Selected option/).closest("p")!;
    expect(selected).toHaveTextContent("$45.00");
    expect(selected).toHaveTextContent("Glove $40.00");
  });

  it("works for a glove without variants", () => {
    renderBuyBox({ product: plainProduct });
    fireEvent.click(chip(/star charm/i));
    expect(mainPrice()).toHaveTextContent("$45.00");
    expect(mainPrice()).toHaveTextContent("Glove $40.00");
  });

  it("shows no total when the cart is off (no panel)", () => {
    renderBuyBox({ cartEnabled: false });
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
  });
});
