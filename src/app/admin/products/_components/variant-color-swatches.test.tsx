import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FormVariant } from "../_validators/schema";

import { VariantColorSwatches } from "./variant-color-swatches";

function variant(options: Record<string, string>): FormVariant {
  return {
    name: Object.values(options).join(" / "),
    inventoryQty: 0,
    options,
  } as FormVariant;
}

const VARIANTS = [
  variant({ Size: "S", Color: "Hunter Green" }),
  variant({ Size: "M", Color: "Hunter Green" }),
  variant({ Size: "S", Color: "Black" }),
  variant({ Size: "M", Color: "Black" }),
  variant({ Size: "S", Color: "Moonbeam" }),
];

describe("VariantColorSwatches", () => {
  it("renders one row per distinct color value and ignores Size", () => {
    render(
      <VariantColorSwatches
        variants={VARIANTS}
        value={{}}
        onChange={() => undefined}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual([
      "Hunter Green",
      "Black",
      "Moonbeam",
    ]);
    expect(screen.queryByText("S")).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Color for Hunter Green (hex)" }),
    ).toBeInTheDocument();
    // Name-matched rows are automatic; unknown names say so.
    expect(within(rows[0]!).getByText("Automatic")).toBeInTheDocument();
    expect(
      within(rows[2]!).getByText("No automatic match"),
    ).toBeInTheDocument();
  });

  it("renders nothing when no variant has a color option", () => {
    const { container } = render(
      <VariantColorSwatches
        variants={[variant({ Size: "S" }), variant({ Size: "M" })]}
        value={{}}
        onChange={() => undefined}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("'Use auto' emits a new object without that key", async () => {
    const onChange = vi.fn();
    const value = { "Hunter Green": "#123456", Black: "#000001" };
    render(
      <VariantColorSwatches
        variants={VARIANTS}
        value={value}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText("Custom")).toHaveLength(2);
    await userEvent.click(
      screen.getByRole("button", { name: /Use auto Color for Hunter Green/ }),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, string>;
    expect(next).toEqual({ Black: "#000001" });
    expect(next).not.toBe(value);
    expect(value).toEqual({ "Hunter Green": "#123456", Black: "#000001" });
  });

  it("a hex edit emits the whole object with a lowercase value", () => {
    const onChange = vi.fn();
    const value = { Black: "#000001" };
    render(
      <VariantColorSwatches
        variants={VARIANTS}
        value={value}
        onChange={onChange}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Color for Moonbeam (hex)" }),
      { target: { value: "#AABBCC" } },
    );

    expect(onChange).toHaveBeenLastCalledWith({
      Black: "#000001",
      Moonbeam: "#aabbcc",
    });
    expect(onChange.mock.calls.at(-1)![0]).not.toBe(value);
  });

  it("a case-different stored key is replaced, not duplicated", () => {
    const onChange = vi.fn();
    render(
      <VariantColorSwatches
        variants={VARIANTS}
        value={{ "hunter green": "#111111" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Color for Hunter Green (hex)" }),
      { target: { value: "#222222" } },
    );

    expect(onChange).toHaveBeenLastCalledWith({ "Hunter Green": "#222222" });
  });
});
