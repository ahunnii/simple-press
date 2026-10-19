import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GloveVariantSelector } from "./glove-variant-selector";

const variants = ["Hunter Green", "Green", "Mystery Hue"].map(
  (color, index) => ({
    id: `var_${index}`,
    name: color,
    inventoryQty: 10,
    options: { Color: color },
  }),
);

function renderSelector(swatchOverrides?: Record<string, string>) {
  return render(
    <GloveVariantSelector
      variants={variants}
      trackInventory={false}
      allowBackorders={false}
      selectedId="var_0"
      onSelect={() => undefined}
      numbered={false}
      swatchOverrides={swatchOverrides}
    />,
  );
}

/** The painted fill inside a color radio, by its accessible name. */
function fillOf(name: string): HTMLElement | null {
  const radio = screen.getByRole("radio", { name });
  return radio.querySelector<HTMLElement>("span[style]");
}

describe("GloveVariantSelector color swatches", () => {
  it("paints an owner override hex for that color", () => {
    renderSelector({ "Hunter Green": "#355e3b" });
    expect(fillOf("Hunter Green")?.style.backgroundColor).toBe("#355e3b");
  });

  it("leaves colors without an override on the name lookup", () => {
    renderSelector({ "Hunter Green": "#355e3b" });
    const plain = fillOf("Green")?.style.backgroundColor;
    expect(plain).toBeTruthy();
    expect(plain).not.toBe("#355e3b");
  });

  it("lets an override colour a name the template does not know", () => {
    renderSelector({ "Mystery Hue": "#ff00aa" });
    expect(fillOf("Mystery Hue")?.style.backgroundColor).toBe("#ff00aa");
  });

  it("keeps an unknown name unpainted when there is no override", () => {
    renderSelector();
    expect(fillOf("Mystery Hue")).toBeNull();
  });
});
