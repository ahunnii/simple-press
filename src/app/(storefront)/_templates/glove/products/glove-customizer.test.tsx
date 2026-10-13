import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOnCopy } from "./glove-addon-picker";
import type { GloveAddOn } from "./glove-addons";
import type {
  CustomizerDefinition,
  PublicCustomizerDefinition,
} from "~/lib/customizer";
import type * as CartContext from "~/providers/cart-context";
import { toPublicCustomizerDefinition } from "~/lib/customizer";
import {
  choiceGroup,
  definition,
  textGroup,
  value,
} from "~/lib/customizer/test-fixtures";
import { useProductCustomizer } from "~/components/customizer";

import { GloveLineOptions } from "../shared/glove-line-options";
import { GloveBuyBox } from "./glove-buy-box";
import { GloveCustomizer } from "./glove-customizer";

// ---- mocks (same shape as glove-addon-picker.test.tsx) --------------------

const addItem = vi.fn<(item: Record<string, unknown>, qty?: number) => void>();
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

// ---- fixtures -------------------------------------------------------------

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

const GLOVE_PRICE = 16000;

/**
 * Optional chain (gold sold out), up to three charms with the cheapest
 * included, and an optional $5 engraving of up to 12 characters.
 */
function buildDefinition(
  overrides: { chainRequired?: boolean; charmsIncluded?: number } = {},
): PublicCustomizerDefinition {
  const def: CustomizerDefinition = definition([
    choiceGroup(
      "chain",
      [
        value("silver", { label: "Silver Chain", priceDelta: 2500 }),
        value("gold", {
          label: "Gold Chain",
          priceDelta: 2500,
          available: false,
        }),
      ],
      {
        name: "Chain",
        maxSelections: 1,
        required: overrides.chainRequired ?? false,
        minSelections: overrides.chainRequired ? 1 : 0,
      },
    ),
    choiceGroup(
      "charms",
      [
        value("star", { label: "Star Charm", priceDelta: 3500 }),
        value("heart", { label: "Heart Charm", priceDelta: 3500 }),
        value("moon", { label: "Moon Charm", priceDelta: 4000 }),
        value("sun", { label: "Sun Charm", priceDelta: 4500 }),
      ],
      {
        name: "Charms",
        maxSelections: 3,
        includedCount: overrides.charmsIncluded ?? 0,
      },
    ),
    textGroup("engraving", {
      name: "Engraving",
      maxLength: 12,
      textPriceCents: 500,
      helpText: "Up to 12 characters, on the inside of the cuff.",
    }),
  ]);
  return toPublicCustomizerDefinition(def);
}

/** Stateful host, mirroring GloveBuyBox. */
function Harness({
  def = buildDefinition(),
  quantity = 1,
  firstStep = 1,
  onAttempt,
}: {
  def?: PublicCustomizerDefinition;
  quantity?: number;
  firstStep?: number | null;
  onAttempt?: (ok: boolean) => void;
}) {
  const controller = useProductCustomizer({
    customizer: def,
    basePrice: GLOVE_PRICE,
    lineQty: quantity,
  });
  return (
    <>
      <GloveCustomizer
        controller={controller}
        gloveAmount={GLOVE_PRICE * quantity}
        quantity={quantity}
        copy={copy}
        firstStep={firstStep}
      />
      <button
        type="button"
        onClick={() => onAttempt?.(controller.revealErrors())}
      >
        try
      </button>
    </>
  );
}

const chip = (name: RegExp | string) =>
  screen.getByRole(/chain/i.test(String(name)) ? "radio" : "checkbox", {
    name,
  });
const totalRegion = () => {
  const el = document.querySelector('[aria-live="polite"]');
  if (!el) throw new Error("no aria-live region");
  return el as HTMLElement;
};

beforeEach(() => {
  addItem.mockClear();
  setIsOpen.mockClear();
});

// ---- picker ---------------------------------------------------------------

describe("GloveCustomizer - rows", () => {
  it("renders the owner's groups: chain radiogroup with 'No chain', charms checkboxes, engraving input", () => {
    render(<Harness />);
    const chains = screen.getByRole("radiogroup", { name: /chain/i });
    expect(within(chains).getAllByRole("radio")).toHaveLength(3); // None + 2
    expect(
      within(chains).getByRole("radio", { name: /no chain/i }),
    ).toHaveAttribute("aria-checked", "true");
    const charms = screen.getByRole("group", { name: /charms/i });
    expect(within(charms).getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getByLabelText(/engraving/i)).toBeInTheDocument();
    expect(screen.getByText("Up to 3")).toBeInTheDocument();
  });

  it("has no 'No' chip for a required single-pick group", () => {
    render(<Harness def={buildDefinition({ chainRequired: true })} />);
    expect(screen.queryByRole("radio", { name: /no chain/i })).toBeNull();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("numbers every group from firstStep, or none when null", () => {
    const { unmount } = render(<Harness firstStep={3} />);
    const steps = () =>
      Array.from(document.querySelectorAll(".glove-medallion")).map((el) =>
        el.textContent.replace("Step", "").trim(),
      );
    expect(steps()).toEqual(["3", "4", "5"]);
    unmount();
    render(<Harness firstStep={null} />);
    expect(steps()).toEqual([]);
  });

  it("marks a sold-out value disabled and cannot pick it", () => {
    render(<Harness />);
    const gold = screen.getByRole("radio", { name: /gold chain/i });
    expect(gold).toHaveAttribute("aria-disabled", "true");
    expect(gold).toHaveTextContent(/sold out/i);
    fireEvent.click(gold);
    expect(gold).toHaveAttribute("aria-checked", "false");
  });

  it("'No chain' clears the group", () => {
    render(<Harness />);
    fireEvent.click(chip(/silver chain/i));
    expect(chip(/silver chain/i)).toHaveAttribute("aria-checked", "true");
    expect(chip(/no chain/i)).toHaveAttribute("aria-checked", "false");
    fireEvent.click(chip(/no chain/i));
    expect(chip(/silver chain/i)).toHaveAttribute("aria-checked", "false");
    expect(chip(/no chain/i)).toHaveAttribute("aria-checked", "true");
  });

  it("allows up to 3 charms, blocks the 4th, and counts '2 of 3'", () => {
    render(<Harness />);
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    fireEvent.click(chip(/moon charm/i));
    const sun = chip(/sun charm/i);
    expect(sun).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(sun);
    expect(sun).toHaveAttribute("aria-checked", "false");
    // A chosen one stays removable, freeing a slot.
    fireEvent.click(chip(/star charm/i));
    expect(chip(/sun charm/i)).not.toHaveAttribute("aria-disabled");
  });
});

describe("GloveCustomizer - included picks and the running total", () => {
  it("keeps an empty polite, atomic live region until something is chosen", () => {
    render(<Harness />);
    expect(totalRegion()).toHaveAttribute("aria-atomic", "true");
    expect(totalRegion()).toBeEmptyDOMElement();
  });

  it("totals the glove, chain and charms like the legacy picker", () => {
    render(<Harness />);
    fireEvent.click(chip(/silver chain/i)); // 25
    fireEvent.click(chip(/star charm/i)); // 35
    fireEvent.click(chip(/moon charm/i)); // 40
    expect(totalRegion()).toHaveTextContent("Glove $160.00");
    expect(totalRegion()).toHaveTextContent("Chain $25.00");
    expect(totalRegion()).toHaveTextContent("Charm $35.00");
    expect(totalRegion()).toHaveTextContent("Charm $40.00");
    expect(totalRegion()).toHaveTextContent("Total $260.00");
  });

  it("marks the cheapest charm 'Included' and leaves it out of the total", () => {
    render(<Harness def={buildDefinition({ charmsIncluded: 1 })} />);
    expect(screen.getByText("Up to 3 · 1 included")).toBeInTheDocument();
    fireEvent.click(chip(/moon charm/i)); // 40, the only pick: waived
    expect(chip(/moon charm/i)).toHaveTextContent("Included");
    expect(totalRegion()).toHaveTextContent("Charm included");
    expect(totalRegion()).toHaveTextContent("Total $160.00");

    fireEvent.click(chip(/star charm/i)); // 35 is now the cheapest
    expect(chip(/star charm/i)).toHaveTextContent("Included");
    expect(chip(/moon charm/i)).toHaveTextContent("$40.00");
    expect(totalRegion()).toHaveTextContent("Total $200.00");
  });

  it("multiplies add-ons by quantity", () => {
    render(<Harness quantity={2} />);
    fireEvent.click(chip(/silver chain/i));
    expect(totalRegion()).toHaveTextContent("Glove $320.00");
    expect(totalRegion()).toHaveTextContent("Chain $50.00");
    expect(totalRegion()).toHaveTextContent("Total $370.00");
  });
});

describe("GloveCustomizer - engraving", () => {
  it("shows the price, the character count and adds it to the total", () => {
    render(<Harness />);
    expect(screen.getByText("+$5.00")).toBeInTheDocument();
    const input = screen.getByLabelText(/engraving/i);
    expect(input).toHaveAttribute("maxlength", "12");
    expect(screen.getByText(/0 \/ 12/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Mom" } });
    expect(screen.getByText(/3 \/ 12/)).toBeInTheDocument();
    expect(totalRegion()).toHaveTextContent("Engraving $5.00");
    expect(totalRegion()).toHaveTextContent("Total $165.00");
    fireEvent.change(input, { target: { value: "" } });
    expect(totalRegion()).toBeEmptyDOMElement();
  });
});

describe("GloveCustomizer - validation", () => {
  it("shows an alert on the required group and moves focus there when an add fails", () => {
    const attempts: boolean[] = [];
    render(
      <Harness
        def={buildDefinition({ chainRequired: true })}
        onAttempt={(ok) => attempts.push(ok)}
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    expect(attempts).toEqual([false]);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /chain/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(document.activeElement).toBe(
      within(screen.getByRole("radiogroup", { name: /chain/i }))
        .getAllByRole("radio")
        .find((r) => r.getAttribute("tabindex") === "0"),
    );
    // Answering it clears the problem.
    fireEvent.click(chip(/silver chain/i));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ---- cart line options ----------------------------------------------------

describe("GloveLineOptions", () => {
  it("lists the chosen options under a cart line, price in purple", () => {
    render(
      <GloveLineOptions
        item={{
          customization: {
            summary: "Chain: Gold",
            lines: [
              { label: "Chain", value: "Gold Chain", price: 2500 },
              { label: "Charms", value: "Heart (included), Star", price: 3500 },
            ],
          },
        }}
      />,
    );
    const list = document.querySelector(
      '[data-slot="customizer-line-options"]',
    );
    expect(list).toHaveTextContent("Chain:Gold Chain+$25.00");
    expect(list).toHaveTextContent("Charms:Heart (included), Star+$35.00");
  });

  it("renders nothing for a plain line", () => {
    const { container } = render(<GloveLineOptions item={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ---- buy box --------------------------------------------------------------

type Product = DefaultProductPageTemplateProps["product"];

function productWith(customizer: PublicCustomizerDefinition | null): Product {
  return {
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
    customizer,
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
}

const legacyAddOn: GloveAddOn = {
  id: "chain-gold",
  slug: "chain-gold",
  name: "Brass Chain",
  imageUrl: null,
  unitPrice: 1500,
  available: true,
  cartItem: {
    productId: "chain-gold",
    productSlug: "chain-gold",
    variantId: null,
    productName: "Brass Chain",
    variantName: null,
    price: 1500,
    compareAtPrice: null,
    imageUrl: null,
    sku: null,
    maxInventory: 10,
  },
};

function renderBuyBox({
  customizer = buildDefinition(),
  addOns = null,
  customizerVisible,
}: {
  customizer?: PublicCustomizerDefinition | null;
  addOns?: { chains: GloveAddOn[]; charms: GloveAddOn[] } | null;
  customizerVisible?: boolean;
} = {}) {
  return render(
    <GloveBuyBox
      product={productWith(customizer)}
      numbered
      intro={null}
      addOns={addOns}
      customizerVisible={customizerVisible}
      categories={[]}
      linkCategories={false}
      cartEnabled
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

describe("GloveBuyBox - product options path", () => {
  it("adds ONE configured line with the options' price, configuration and display lines", () => {
    renderBuyBox();
    fireEvent.click(chip(/silver chain/i));
    fireEvent.click(chip(/star charm/i));
    fireEvent.click(chip(/heart charm/i));
    fireEvent.change(screen.getByLabelText(/engraving/i), {
      target: { value: "Mom" },
    });
    fireEvent.click(addToCart());

    expect(addItem).toHaveBeenCalledTimes(1);
    const [line, qty] = addItem.mock.calls[0]!;
    expect(qty).toBe(1);
    expect(line).toMatchObject({
      productId: "glove-1",
      variantId: "glove-v-m",
      // 160 + 25 chain + 35 + 35 charms + 5 engraving
      price: 26000,
      configuration: {
        choices: expect.arrayContaining([
          { groupId: "chain", valueIds: ["silver"] },
          { groupId: "charms", valueIds: ["heart", "star"] },
        ]) as unknown,
        texts: [{ groupId: "engraving", text: "Mom" }],
      },
    });
    expect(line).not.toHaveProperty("addOnFor");
    expect(line.configKey).toBeTruthy();
    expect(
      (line.customization as { lines: { label: string }[] }).lines.map(
        (l) => l.label,
      ),
    ).toEqual(["Chain", "Charms", "Engraving"]);
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  it("shows the configured price in the price spot", () => {
    renderBuyBox();
    fireEvent.click(chip(/silver chain/i));
    expect(screen.getAllByText("Glove $160.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$185.00").length).toBeGreaterThan(0);
  });

  it("adds a plain line when nothing is chosen", () => {
    renderBuyBox();
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(1);
    const [line] = addItem.mock.calls[0]!;
    expect(line).toMatchObject({ productId: "glove-1", price: GLOVE_PRICE });
    expect(line).not.toHaveProperty("configuration");
  });

  it("does not add while a required group is unanswered, and says why", () => {
    renderBuyBox({ customizer: buildDefinition({ chainRequired: true }) });
    fireEvent.click(addToCart());
    expect(addItem).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(chip(/silver chain/i));
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it("resets the picker after adding", () => {
    renderBuyBox();
    fireEvent.click(chip(/silver chain/i));
    fireEvent.click(addToCart());
    expect(chip(/no chain/i)).toHaveAttribute("aria-checked", "true");
    expect(totalRegion()).toBeEmptyDOMElement();
  });

  it("takes over from the legacy add-ons: the old picker is not rendered", () => {
    renderBuyBox({
      addOns: { chains: [legacyAddOn], charms: [] },
    });
    expect(screen.queryByRole("radio", { name: /brass chain/i })).toBeNull();
    expect(screen.getByRole("radio", { name: /silver chain/i })).toBeTruthy();
    fireEvent.click(addToCart());
    // No separate chain line.
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it("hides the picker when the owner hides the section (and nothing is required)", () => {
    renderBuyBox({ customizerVisible: false });
    expect(screen.queryByText(copy.heading)).toBeNull();
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(1);
  });
});

describe("GloveBuyBox - no customizer keeps the legacy path", () => {
  it("shows the legacy picker and adds separate addOnFor lines", () => {
    renderBuyBox({
      customizer: null,
      addOns: { chains: [legacyAddOn], charms: [] },
    });
    fireEvent.click(chip(/brass chain/i));
    fireEvent.click(addToCart());
    expect(addItem).toHaveBeenCalledTimes(2);
    expect(addItem.mock.calls[1]![0]).toMatchObject({
      productId: "chain-gold",
      addOnFor: "glove-1:glove-v-m",
    });
    expect(addItem.mock.calls[0]![0]).not.toHaveProperty("configuration");
  });
});
