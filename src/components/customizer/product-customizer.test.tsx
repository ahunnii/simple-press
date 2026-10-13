import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ProductCustomizerController } from "./use-product-customizer";
import type { PublicCustomizerDefinition } from "~/lib/customizer";
import { configKey } from "~/lib/customizer";

import { OrderItemOptions } from "./order-item-options";
import {
  ProductCustomizer,
  ProductCustomizerTotal,
} from "./product-customizer";
import { useProductCustomizer } from "./use-product-customizer";

const DEF: PublicCustomizerDefinition = {
  productId: "glove",
  groups: [
    {
      id: "chain",
      name: "Chain",
      helpText: "Pick a chain",
      kind: "choice",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      includedCount: 0,
      display: "swatches",
      maxLength: null,
      placeholder: null,
      textPriceCents: 0,
      sortOrder: 0,
      values: [
        {
          id: "gold",
          label: "Gold",
          imageUrl: null,
          swatchColor: "#d4af37",
          price: 1000,
          available: true,
          maxQty: null,
          sortOrder: 0,
        },
        {
          id: "silver",
          label: "Silver",
          imageUrl: null,
          swatchColor: "#c0c0c0",
          price: 500,
          available: true,
          maxQty: null,
          sortOrder: 1,
        },
      ],
    },
    {
      id: "charms",
      name: "Charms",
      helpText: null,
      kind: "choice",
      required: false,
      minSelections: 0,
      maxSelections: 2,
      includedCount: 1,
      display: "tiles",
      maxLength: null,
      placeholder: null,
      textPriceCents: 0,
      sortOrder: 1,
      values: [
        {
          id: "heart",
          label: "Heart",
          imageUrl: null,
          swatchColor: null,
          price: 300,
          available: true,
          maxQty: null,
          sortOrder: 0,
        },
        {
          id: "star",
          label: "Star",
          imageUrl: null,
          swatchColor: null,
          price: 500,
          available: true,
          maxQty: null,
          sortOrder: 1,
        },
        {
          id: "moon",
          label: "Moon",
          imageUrl: null,
          swatchColor: null,
          price: 400,
          available: true,
          maxQty: null,
          sortOrder: 2,
        },
        {
          id: "sun",
          label: "Sun",
          imageUrl: null,
          swatchColor: null,
          price: 400,
          available: false,
          maxQty: 0,
          sortOrder: 3,
        },
      ],
    },
    {
      id: "engraving",
      name: "Engraving",
      helpText: null,
      kind: "text",
      required: false,
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      display: "tiles",
      maxLength: 8,
      placeholder: "Initials",
      textPriceCents: 700,
      sortOrder: 2,
      values: [],
    },
  ],
};

let controller: ProductCustomizerController;

function Harness({
  def = DEF,
  basePrice = 4000,
}: {
  def?: PublicCustomizerDefinition | null;
  basePrice?: number;
}) {
  controller = useProductCustomizer({ customizer: def, basePrice });
  return (
    <>
      <ProductCustomizer controller={controller} />
      <ProductCustomizerTotal controller={controller} />
    </>
  );
}

const total = () =>
  document.querySelector('[data-slot="customizer-total"]')?.textContent;

describe("ProductCustomizer", () => {
  it("renders groups as fieldsets with radio / checkbox semantics", () => {
    render(<Harness />);
    const chain = screen.getByRole("group", { name: /Chain/ });
    expect(within(chain).getAllByRole("radio")).toHaveLength(2);
    const charms = screen.getByRole("group", { name: /Charms/ });
    expect(within(charms).getAllByRole("checkbox")).toHaveLength(4);
    expect(within(charms).getByText("0 of 2 · 1 included")).toBeVisible();
  });

  it("selects with the keyboard and updates the live total", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const totalEl = document.querySelector('[data-slot="customizer-total"]');
    expect(totalEl).toHaveAttribute("aria-live", "polite");
    expect(total()).toBe("Total $40.00");

    await user.tab(); // first radio of the chain group
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: /Gold/ })).toBeChecked();
    expect(total()).toBe("Total $50.00");

    // Arrow keys move within the radio group (native radio behaviour).
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Silver/ })).toBeChecked();
    expect(total()).toBe("Total $45.00");
  });

  it("marks the cheapest charm as included and charges the rest", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: /Star/ }));
    await user.click(screen.getByRole("checkbox", { name: /Heart/ }));

    const heart = screen
      .getByRole("checkbox", { name: /Heart/ })
      .closest('[data-slot="customizer-value"]');
    const star = screen
      .getByRole("checkbox", { name: /Star/ })
      .closest('[data-slot="customizer-value"]');
    expect(heart).toHaveAttribute("data-included", "true");
    expect(heart).toHaveTextContent("Included");
    expect(star).not.toHaveAttribute("data-included");
    expect(star).toHaveTextContent("+$5.00");
    // Base 40 + star 5 (heart waived); the required chain is still missing,
    // but the preview price keeps moving.
    expect(total()).toBe("Total $45.00");
  });

  it("refuses a pick past the max with a message", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: /Heart/ }));
    await user.click(screen.getByRole("checkbox", { name: /Star/ }));
    await user.click(screen.getByRole("checkbox", { name: /Moon/ }));
    expect(screen.getByRole("checkbox", { name: /Moon/ })).not.toBeChecked();
    expect(
      screen
        .getByRole("group", { name: /Charms/ })
        .querySelector('[data-slot="customizer-limit"]'),
    ).toHaveTextContent("You can choose up to 2 options");
    expect(screen.getByText("2 of 2 · 1 included")).toBeVisible();

    // Removing one lets another in.
    await user.click(screen.getByRole("checkbox", { name: /Heart/ }));
    await user.click(screen.getByRole("checkbox", { name: /Moon/ }));
    expect(screen.getByRole("checkbox", { name: /Moon/ })).toBeChecked();
  });

  it("disables a sold-out value and labels it", () => {
    render(<Harness />);
    const sun = screen.getByRole("checkbox", { name: /Sun/ });
    expect(sun).toBeDisabled();
    expect(sun.closest('[data-slot="customizer-value"]')).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(sun.closest('[data-slot="customizer-value"]')).toHaveTextContent(
      "Sold out",
    );
  });

  it("shows the required error only after an add attempt, linked by aria-describedby", () => {
    render(<Harness />);
    expect(document.querySelector('[data-slot="customizer-error"]')).toBeNull();

    let ok = true;
    act(() => {
      ok = controller.revealErrors();
    });
    expect(ok).toBe(false);
    const chain = screen.getByRole("group", { name: /Chain/ });
    expect(chain).toHaveAttribute("data-invalid", "true");
    const error = within(chain).getByText("Choose your chain");
    expect(chain.getAttribute("aria-describedby")).toContain(error.id);
    // Focus moves to the first invalid group.
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /Gold/ }),
    );
  });

  it("builds cart fields: normalized configuration, key and display lines", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: /Silver/ }));
    await user.click(screen.getByRole("checkbox", { name: /Star/ }));
    await user.click(screen.getByRole("checkbox", { name: /Heart/ }));
    await user.type(screen.getByRole("textbox", { name: /Engraving/ }), " AB ");

    expect(controller.isComplete).toBe(true);
    const fields = controller.toCartFields();
    expect(fields?.configuration).toEqual({
      choices: [
        { groupId: "chain", valueIds: ["silver"] },
        { groupId: "charms", valueIds: ["heart", "star"] },
      ],
      texts: [{ groupId: "engraving", text: "AB" }],
    });
    expect(fields?.configKey).toBe(configKey(fields?.configuration));
    expect(fields?.customization.lines).toEqual([
      { label: "Chain", value: "Silver", price: 500 },
      { label: "Charms", value: "Heart (included), Star", price: 500 },
      { label: "Engraving", value: "“AB”", price: 700 },
    ]);
    expect(fields?.customization.summary).toBe(
      "Chain: Silver · Charms: Heart, Star · Engraving: “AB”",
    );
    // Base 40 + silver 5 + star 5 + engraving 7.
    expect(total()).toBe("Total $57.00");
  });

  it("caps the text input and counts characters", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: /Engraving/ });
    expect(input).toHaveAttribute("maxlength", "8");
    await user.type(input, "Amy");
    expect(
      document.querySelector('[data-slot="customizer-text-counter"]'),
    ).toHaveTextContent("3 / 8");
  });

  it("resets the selection when the definition changes and renders nothing without one", async () => {
    const user = userEvent.setup();
    const { rerender, container } = render(<Harness />);
    await user.click(screen.getByRole("radio", { name: /Gold/ }));
    expect(controller.selection.choices).toHaveLength(1);

    rerender(<Harness def={{ ...DEF, productId: "other" }} />);
    expect(controller.selection.choices).toHaveLength(0);

    rerender(<Harness def={null} />);
    expect(controller.enabled).toBe(false);
    expect(controller.toCartFields()).toBeNull();
    expect(controller.revealErrors()).toBe(true);
    expect(container.querySelector('[data-slot="customizer"]')).toBeNull();
  });
});

describe("OrderItemOptions", () => {
  it("renders a stored snapshot as text and ignores malformed data", () => {
    const { container, rerender } = render(
      <OrderItemOptions
        customization={{
          v: 1,
          basePrice: 4000,
          addOnTotal: 500,
          summary: "x",
          groups: [
            {
              groupId: "charms",
              name: "Charms",
              kind: "choice",
              selections: [
                { label: "<b>Heart</b>", price: 0, included: true },
                { label: "Star", price: 500, included: false },
              ],
            },
          ],
          components: [],
        }}
      />,
    );
    const options = container.querySelector(
      '[data-slot="customizer-line-options"]',
    );
    expect(options).toHaveTextContent(
      "Charms:<b>Heart</b> (included), Star+$5.00",
    );
    expect(container.querySelector("b")).toBeNull();

    rerender(<OrderItemOptions customization={{ v: 2 }} />);
    expect(
      container.querySelector('[data-slot="customizer-line-options"]'),
    ).toBeNull();
  });
});
