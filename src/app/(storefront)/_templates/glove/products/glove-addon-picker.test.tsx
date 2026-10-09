import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOnCopy } from "./glove-addon-picker";
import type { GloveAddOn } from "./glove-addons";
import type * as CartContext from "~/providers/cart-context";

import { GLOVE_MAX_CHARMS, GloveAddOnPicker } from "./glove-addon-picker";
import { GloveBuyBox } from "./glove-buy-box";

// ---- mocks ---------------------------------------------------------------

const addItem = vi.fn<(item: { productId: string }, qty?: number) => void>();
const setIsOpen = vi.fn();

vi.mock("~/providers/cart-context", async (importOriginal) => ({
  cartLineKey: (await importOriginal<typeof CartContext>()).cartLineKey,
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
  // Keep the real label (the picker uses it); the option grid isn't under test.
  return { ...actual, GloveVariantSelector: () => null };
});
vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => (
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
  charmsLimit: "Choose up to 3",
  gloveLine: "Glove",
  charmLine: "Charm",
  totalLine: "Total",
};

function addOn(
  id: string,
  name: string,
  unitPrice: number,
  available = true,
): GloveAddOn {
  return {
    id,
    slug: id,
    name,
    imageUrl: null,
    unitPrice,
    available,
    cartItem: {
      productId: id,
      productSlug: id,
      variantId: `${id}-v`,
      productName: name,
      variantName: "Default",
      price: unitPrice,
      compareAtPrice: null,
      imageUrl: null,
      sku: null,
      maxInventory: 10,
    },
  };
}

const chains = [
  addOn("chain-gold", "Gold Chain", 1500),
  addOn("chain-silver", "Silver Chain", 2000, false),
];
const charms = [
  addOn("charm-a", "Star Charm", 500),
  addOn("charm-b", "Heart Charm", 600),
  addOn("charm-c", "Moon Charm", 700),
  addOn("charm-d", "Sun Charm", 800),
];

const GLOVE_PRICE = 4000;

/** Stateful host for the controlled picker, mirroring GloveBuyBox. */
function Harness({
  chainList = chains,
  charmList = charms,
  quantity = 1,
  onState,
}: {
  chainList?: GloveAddOn[];
  charmList?: GloveAddOn[];
  quantity?: number;
  onState?: (s: { chainId: string | null; charmIds: string[] }) => void;
}) {
  const [chainId, setChainId] = useState<string | null>(null);
  const [charmIds, setCharmIds] = useState<string[]>([]);
  onState?.({ chainId, charmIds });
  return (
    <GloveAddOnPicker
      chains={chainList}
      charms={charmList}
      chainId={chainId}
      onChainChange={setChainId}
      charmIds={charmIds}
      onCharmsChange={setCharmIds}
      gloveAmount={GLOVE_PRICE * quantity}
      quantity={quantity}
      copy={copy}
    />
  );
}

const chip = (name: RegExp | string) =>
  screen.getByRole(/chain/i.test(String(name)) ? "radio" : "checkbox", {
    name,
  });

beforeEach(() => {
  addItem.mockClear();
  setIsOpen.mockClear();
});

// ---- picker --------------------------------------------------------------

describe("GloveAddOnPicker - step numbers", () => {
  const stepsOf = () =>
    Array.from(document.querySelectorAll(".glove-medallion")).map((el) =>
      el.textContent.replace("Step", "").trim(),
    );

  it("starts at 1 and counts the rows it shows", () => {
    render(<Harness />);
    expect(stepsOf()).toEqual(["1", "2"]);
  });

  it("continues from firstStep passed by the buy box", () => {
    render(
      <GloveAddOnPicker
        chains={chains}
        charms={charms}
        chainId={null}
        onChainChange={() => undefined}
        charmIds={[]}
        onCharmsChange={() => undefined}
        gloveAmount={GLOVE_PRICE}
        quantity={1}
        copy={copy}
        firstStep={4}
      />,
    );
    expect(stepsOf()).toEqual(["4", "5"]);
  });

  it("does not skip a number when there are no chains", () => {
    render(<Harness chainList={[]} />);
    expect(stepsOf()).toEqual(["1"]);
  });
});

describe("GloveAddOnPicker - chain row", () => {
  it("is a labelled radiogroup with a 'No chain' option selected by default", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: /chain/i });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3); // No chain + 2 chains
    const none = within(group).getByRole("radio", { name: /no chain/i });
    expect(none).toHaveAttribute("aria-checked", "true");
    expect(
      within(group).getByRole("radio", { name: /gold chain/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("marks the chosen chain checked and unchecks the rest; 'No chain' resets", () => {
    render(<Harness />);
    const gold = screen.getByRole("radio", { name: /gold chain/i });
    const none = screen.getByRole("radio", { name: /no chain/i });

    fireEvent.click(gold);
    expect(gold).toHaveAttribute("aria-checked", "true");
    expect(none).toHaveAttribute("aria-checked", "false");

    fireEvent.click(none);
    expect(gold).toHaveAttribute("aria-checked", "false");
    expect(none).toHaveAttribute("aria-checked", "true");
  });

  it("exactly one chain radio is a tab stop (roving tabindex)", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: /chain/i });
    const stops = within(group)
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAccessibleName(/no chain/i);
  });

  it("arrow keys move to the next chain and pick it, skipping nothing selectable", () => {
    render(<Harness />);
    const none = screen.getByRole("radio", { name: /no chain/i });
    none.focus();
    fireEvent.keyDown(none, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /gold chain/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows the out-of-stock chain as disabled and cannot be chosen", () => {
    render(<Harness />);
    const silver = screen.getByRole("radio", { name: /silver chain/i });
    expect(silver).toHaveAttribute("aria-disabled", "true");
    expect(silver).toHaveTextContent(/sold out/i);

    fireEvent.click(silver);
    expect(silver).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /no chain/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("arrow keys onto a sold-out chain move focus but do not select it", () => {
    render(<Harness />);
    const gold = screen.getByRole("radio", { name: /gold chain/i });
    fireEvent.click(gold);
    gold.focus();
    fireEvent.keyDown(gold, { key: "ArrowRight" });
    expect(
      screen.getByRole("radio", { name: /silver chain/i }),
    ).toHaveAttribute("aria-checked", "false");
    expect(gold).toHaveAttribute("aria-checked", "true");
  });
});

describe("GloveAddOnPicker - charms row", () => {
  it("renders checkbox semantics in a labelled group", () => {
    render(<Harness />);
    const group = screen.getByRole("group", { name: /charms/i });
    const boxes = within(group).getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    for (const box of boxes)
      expect(box).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Choose up to 3")).toBeInTheDocument();
  });

  it("allows up to 3 and blocks the 4th (aria-disabled, click ignored)", () => {
    const states: { chainId: string | null; charmIds: string[] }[] = [];
    render(<Harness onState={(s) => states.push(s)} />);
    expect(GLOVE_MAX_CHARMS).toBe(3);

    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    fireEvent.click(chip(/moon charm/i));

    const sun = chip(/sun charm/i);
    expect(sun).toHaveAttribute("aria-disabled", "true");
    expect(sun).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sun);
    expect(sun).toHaveAttribute("aria-checked", "false");
    expect(states.at(-1)!.charmIds).toEqual(["charm-a", "charm-b", "charm-c"]);

    // The already-chosen ones stay enabled so they can be toggled off.
    expect(chip(/star charm/i)).not.toHaveAttribute("aria-disabled");
  });

  it("toggling a chosen charm off frees a slot for another", () => {
    render(<Harness />);
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    fireEvent.click(chip(/moon charm/i));

    fireEvent.click(chip(/star charm/i));
    expect(chip(/star charm/i)).toHaveAttribute("aria-checked", "false");
    expect(chip(/sun charm/i)).not.toHaveAttribute("aria-disabled");

    fireEvent.click(chip(/sun charm/i));
    expect(chip(/sun charm/i)).toHaveAttribute("aria-checked", "true");
  });

  it("reports the running count of chosen charms", () => {
    render(<Harness />);
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });
});

describe("GloveAddOnPicker - live total", () => {
  const totalRegion = () => {
    const el = document.querySelector('[aria-live="polite"]');
    if (!el) throw new Error("no aria-live region");
    return el as HTMLElement;
  };

  it("keeps an empty polite, atomic live region until an add-on is chosen", () => {
    render(<Harness />);
    const region = totalRegion();
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toBeEmptyDOMElement();
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument();
  });

  it("shows the glove line and the total once a chain or charm is chosen", () => {
    render(<Harness />);
    fireEvent.click(chip(/star charm/i)); // +5.00
    const region = totalRegion();
    expect(region).toHaveTextContent("Glove $40.00");
    expect(region).toHaveTextContent("Total $45.00");
  });

  it("hides the total again when every add-on is deselected", () => {
    render(<Harness />);
    fireEvent.click(chip(/gold chain/i));
    expect(totalRegion()).toHaveTextContent("Total $55.00");
    fireEvent.click(chip(/no chain/i));
    expect(totalRegion()).toBeEmptyDOMElement();
  });

  it("adds the chain and each charm, and drops them when deselected", () => {
    render(<Harness />);
    fireEvent.click(chip(/gold chain/i)); // +15.00
    fireEvent.click(chip(/star charm/i)); // +5.00
    fireEvent.click(chip(/heart charm/i)); // +6.00
    const region = totalRegion();
    expect(region).toHaveTextContent("Total $66.00");
    expect(region).toHaveTextContent("Chain $15.00");
    expect(region).toHaveTextContent("Charm $5.00");
    expect(region).toHaveTextContent("Charm $6.00");

    fireEvent.click(chip(/star charm/i));
    expect(totalRegion()).toHaveTextContent("Total $61.00");
    fireEvent.click(chip(/no chain/i));
    expect(totalRegion()).toHaveTextContent("Total $46.00");
  });

  it("multiplies add-ons by quantity (each add-on is added once per glove)", () => {
    render(<Harness quantity={2} />);
    fireEvent.click(chip(/gold chain/i)); // 2 x 15.00
    fireEvent.click(chip(/star charm/i)); // 2 x 5.00
    const region = totalRegion();
    expect(region).toHaveTextContent("Glove $80.00");
    expect(region).toHaveTextContent("Chain $30.00");
    expect(region).toHaveTextContent("Charm $10.00");
    expect(region).toHaveTextContent("Total $120.00");
  });
});

describe("GloveAddOnPicker - empty collections", () => {
  it("hides the chain row when there are no chains", () => {
    render(<Harness chainList={[]} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /charms/i })).toBeInTheDocument();
  });

  it("hides the charms row when there are no charms", () => {
    render(<Harness charmList={[]} />);
    expect(screen.queryByRole("group", { name: /charms/i })).toBeNull();
    expect(
      screen.getByRole("radiogroup", { name: /chain/i }),
    ).toBeInTheDocument();
  });

  // The picker component itself still renders its heading + total shell with
  // two empty lists; GloveBuyBox is what suppresses it (see below).
  it("GloveBuyBox renders no picker at all when both lists are empty", () => {
    renderBuyBox({ addOns: { chains: [], charms: [] } });
    expect(screen.queryByText(copy.heading)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});

// ---- buy box -------------------------------------------------------------

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
  addOns = { chains, charms },
  cartEnabled = true,
  categories = [],
}: {
  product?: Product;
  addOns?: { chains: GloveAddOn[]; charms: GloveAddOn[] } | null;
  cartEnabled?: boolean;
  categories?: { name: string; slug: string }[];
} = {}) {
  return render(
    <GloveBuyBox
      product={product}
      numbered
      intro={null}
      addOns={addOns}
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

describe("GloveBuyBox - add to cart with add-ons", () => {
  it("adds the glove variant plus the chosen chain and charms as separate lines, then opens the drawer", () => {
    renderBuyBox();
    fireEvent.click(chip(/gold chain/i));
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/moon charm/i));
    fireEvent.click(addToCart());

    expect(addItem).toHaveBeenCalledTimes(4);
    const [glove, chain, c1, c2] = addItem.mock.calls as [
      [{ productId: string; variantId: string | null }, number],
      [{ productId: string; variantId: string | null }, number],
      [{ productId: string; variantId: string | null }, number],
      [{ productId: string; variantId: string | null }, number],
    ];
    expect(glove[0]).toMatchObject({
      productId: "glove-1",
      variantId: "glove-v-m",
    });
    expect(glove[1]).toBe(1);
    expect(chain[0]).toMatchObject({
      productId: "chain-gold",
      variantId: "chain-gold-v",
    });
    expect(chain[1]).toBe(1);
    expect(c1[0]).toMatchObject({ productId: "charm-a" });
    expect(c1[1]).toBe(1);
    expect(c2[0]).toMatchObject({ productId: "charm-c" });
    expect(c2[1]).toBe(1);
    // Each add-on is tied to the glove line so the cart nests it.
    for (const [item] of [chain, c1, c2]) {
      expect(item).toMatchObject({ addOnFor: "glove-1:glove-v-m" });
    }
    expect(glove[0]).not.toHaveProperty("addOnFor");

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("adds only the glove when no add-ons are chosen", () => {
    renderBuyBox();
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addItem.mock.calls[0]![0]).toMatchObject({ productId: "glove-1" });
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("resets the picker after adding so add-ons are not re-added by accident", () => {
    renderBuyBox();
    fireEvent.click(chip(/gold chain/i));
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(addToCart());

    expect(chip(/no chain/i)).toHaveAttribute("aria-checked", "true");
    expect(chip(/star charm/i)).toHaveAttribute("aria-checked", "false");
    expect(
      document.querySelector('[aria-live="polite"]'),
    ).toBeEmptyDOMElement();
  });

  it("adds each add-on once per glove at the chosen quantity", () => {
    renderBuyBox();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(chip(/gold chain/i));
    fireEvent.click(chip(/heart charm/i));
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Total $122.00", // 2 x (40 + 15 + 6)
    );
    fireEvent.click(addToCart());

    expect(addItem).toHaveBeenCalledTimes(3);
    expect(addItem.mock.calls.map((c) => [c[0].productId, c[1]])).toEqual([
      ["glove-1", 2],
      ["chain-gold", 2],
      ["charm-b", 2],
    ]);
  });

  it("works for a glove without variants (plain add-to-cart path)", () => {
    renderBuyBox({ product: plainProduct });
    fireEvent.click(chip(/silver chain/i)); // sold out: ignored
    fireEvent.click(chip(/gold chain/i));
    fireEvent.click(addToCart());

    expect(addItem).toHaveBeenCalledTimes(2);
    expect(addItem.mock.calls[0]![0]).toMatchObject({
      productId: "glove-2",
      variantId: null,
    });
    expect(addItem.mock.calls[1]![0]).toMatchObject({
      productId: "chain-gold",
      addOnFor: "glove-2:base",
    });
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("does not show the picker when addOns is null", () => {
    renderBuyBox({ addOns: null });
    expect(screen.queryByText(copy.heading)).not.toBeInTheDocument();
  });
});

describe("GloveBuyBox - catalog mode (cart off)", () => {
  it("hides Add to Cart, the qty stepper and the add-on picker", () => {
    renderBuyBox({ cartEnabled: false });
    expect(
      screen.queryByRole("button", { name: "ADD TO CART" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Quantity" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /increase quantity/i }),
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

describe("GloveBuyBox - meta line", () => {
  it("shows category and SKU on one muted line", () => {
    renderBuyBox({ categories: [{ name: "Gloves", slug: "gloves" }] });
    const line = screen.getByText(/Category:/);
    expect(line).toHaveTextContent(/Category: Gloves · SKU LG-/);
  });

  it("drops the separator when there is no category", () => {
    renderBuyBox();
    expect(screen.getByText(/SKU LG-/)).not.toHaveTextContent("·");
    expect(screen.queryByText(/Category/)).not.toBeInTheDocument();
  });
});

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
    const buttons = screen.getAllByRole("button", {
      name: "ADD TO CART",
      hidden: true,
    });
    const el = buttons[1]?.closest("[aria-hidden]");
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
  const bar = () =>
    screen
      .getAllByRole("button", { name: "ADD TO CART", hidden: true })[1]!
      .closest("[aria-hidden]")!;

  it("shows only the glove price with no add-on chosen", () => {
    renderBuyBox();
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
    expect(bar()).not.toHaveTextContent("Glove");
  });

  it("swaps in the picker's total, with the glove price beneath, in the main spot and the buy bar", () => {
    renderBuyBox();
    fireEvent.click(chip(/star charm/i)); // +$5.00
    expect(mainPrice()).toHaveTextContent("$45.00");
    expect(mainPrice()).toHaveTextContent("Glove $40.00");
    expect(bar()).toHaveTextContent("$45.00");
    expect(bar()).toHaveTextContent("Glove $40.00");
    // The picker's itemised line says the same number.
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

  it("multiplies by quantity like the picker", () => {
    renderBuyBox();
    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    fireEvent.click(chip(/star charm/i));
    // 2 × $40.00 + 2 × $5.00
    expect(mainPrice()).toHaveTextContent("$90.00");
    expect(mainPrice()).toHaveTextContent("Glove $80.00");
  });

  it("is not a live region (the picker's total is the one announcement)", () => {
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

  it("shows no total when the cart is off (no picker)", () => {
    renderBuyBox({ cartEnabled: false });
    expect(mainPrice()).toHaveTextContent("$40.00");
    expect(mainPrice()).not.toHaveTextContent("Glove");
  });
});
