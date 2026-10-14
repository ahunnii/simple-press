import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  PublicCustomizerDefinition,
  PublicCustomizerValue,
} from "~/lib/customizer";

import {
  ChooseOptionsDialog,
  configuredLinePreview,
} from "./choose-options-dialog";

function value(
  id: string,
  label: string,
  price: number,
  sortOrder: number,
): PublicCustomizerValue {
  return {
    id,
    label,
    imageUrl: null,
    swatchColor: null,
    price,
    available: true,
    maxQty: null,
    sortOrder,
  };
}

const DEF: PublicCustomizerDefinition = {
  productId: "glove",
  groups: [
    {
      id: "chain",
      name: "Chain",
      helpText: null,
      kind: "choice",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      includedCount: 0,
      display: "tiles",
      maxLength: null,
      placeholder: null,
      textPriceCents: 0,
      sortOrder: 0,
      values: [
        value("gold", "Gold", 1000, 0),
        value("silver", "Silver", 500, 1),
      ],
    },
    {
      id: "charms",
      name: "Charms",
      helpText: null,
      kind: "choice",
      required: false,
      minSelections: 0,
      maxSelections: 3,
      includedCount: 1,
      display: "tiles",
      maxLength: null,
      placeholder: null,
      textPriceCents: 0,
      sortOrder: 1,
      values: [value("heart", "Heart", 300, 0), value("star", "Star", 500, 1)],
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

function renderDialog(
  props: Partial<Parameters<typeof ChooseOptionsDialog>[0]> = {},
) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ChooseOptionsDialog
      open
      onOpenChange={onOpenChange}
      productName="Classic Glove"
      definition={DEF}
      basePrice={4000}
      quantity={1}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, onOpenChange };
}

const eachTotal = () =>
  document.querySelector('[data-slot="customizer-total"]')?.textContent;

describe("ChooseOptionsDialog", () => {
  it("renders the product's option groups in a titled dialog", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Choose options" }),
    ).toHaveAccessibleDescription(/Classic Glove/);
    expect(screen.getByRole("group", { name: /Chain/ })).toBeVisible();
    expect(screen.getByRole("group", { name: /Charms/ })).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Engraving/ })).toBeVisible();
    expect(eachTotal()).toBe("Each $40.00");
  });

  it("blocks saving until required picks are made", async () => {
    const user = userEvent.setup();
    const { onSave, onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Save options" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: /Chain/ })).toHaveAttribute(
      "data-invalid",
      "true",
    );
  });

  it("saves the normalized selection (ids + text) and closes", async () => {
    const user = userEvent.setup();
    const { onSave, onOpenChange } = renderDialog();
    await user.click(screen.getByRole("radio", { name: /Gold/ }));
    await user.click(screen.getByRole("checkbox", { name: /Star/ }));
    await user.click(screen.getByRole("checkbox", { name: /Heart/ }));
    await user.type(screen.getByRole("textbox", { name: /Engraving/ }), "AMY");
    // 40 + gold 10 + star 5 (heart included) + engraving 7.
    expect(eachTotal()).toBe("Each $62.00");

    await user.click(screen.getByRole("button", { name: "Save options" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0]![0] as {
      choices: { groupId: string; valueIds: string[] }[];
      texts: { groupId: string; text: string }[];
    };
    expect(saved.texts).toEqual([{ groupId: "engraving", text: "AMY" }]);
    expect(saved.choices).toEqual(
      expect.arrayContaining([
        { groupId: "chain", valueIds: ["gold"] },
        {
          groupId: "charms",
          valueIds: expect.arrayContaining(["heart", "star"]) as string[],
        },
      ]),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reopens on the line's saved picks", () => {
    renderDialog({
      initialSelection: {
        choices: [{ groupId: "chain", valueIds: ["silver"] }],
        texts: [{ groupId: "engraving", text: "JO" }],
      },
    });
    expect(screen.getByRole("radio", { name: /Silver/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Gold/ })).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: /Engraving/ })).toHaveValue(
      "JO",
    );
    expect(eachTotal()).toBe("Each $52.00");
  });

  it("saves nothing chosen as undefined (a plain line)", async () => {
    const user = userEvent.setup();
    const optional: PublicCustomizerDefinition = {
      ...DEF,
      groups: DEF.groups.filter((g) => g.id !== "chain"),
    };
    const { onSave } = renderDialog({ definition: optional });
    await user.click(screen.getByRole("button", { name: "Save options" }));
    expect(onSave).toHaveBeenCalledWith(undefined);
  });

  it("cancels without saving", async () => {
    const user = userEvent.setup();
    const { onSave, onOpenChange } = renderDialog();
    await user.click(screen.getByRole("radio", { name: /Gold/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("configuredLinePreview", () => {
  it("prices a complete build and summarizes it in group order", () => {
    expect(
      configuredLinePreview(
        DEF,
        {
          choices: [
            { groupId: "charms", valueIds: ["star", "heart"] },
            { groupId: "chain", valueIds: ["gold"] },
          ],
          texts: [{ groupId: "engraving", text: "AMY" }],
        },
        4000,
        2,
      ),
    ).toEqual({
      unitPrice: 6200,
      summary: "Chain: Gold · Charms: Heart, Star · Engraving: “AMY”",
      invalid: false,
    });
  });

  it("flags a missing required pick and falls back to the base price", () => {
    expect(configuredLinePreview(DEF, undefined, 4000, 1)).toEqual({
      unitPrice: 4000,
      summary: "",
      invalid: true,
    });
  });
});
