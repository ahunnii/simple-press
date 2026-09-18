import { describe, expect, it } from "vitest";

import type { CustomRequestExtras } from "./compose-custom-request";
import { CONTACT_MESSAGE_MAX_LENGTH } from "~/lib/validators/contact";

import {
  composeCustomRequestMessage,
  composeCustomRequestPrefix,
} from "./compose-custom-request";

const fullExtras: CustomRequestExtras = {
  productType: "candles",
  quantity: "24",
  dateNeeded: "2026-11-01",
  occasion: "Wedding favors",
  scentColourNotes: "Lavender and gold jars, please.",
};

describe("composeCustomRequestPrefix", () => {
  it("renders every line, in order, when every extra is filled in", () => {
    const prefix = composeCustomRequestPrefix(fullExtras);
    expect(prefix).toBe(
      [
        "Custom order request",
        "Product type: Candles",
        "Quantity: 24 · Date needed: 2026-11-01",
        "Occasion: Wedding favors",
        "Scent or colour notes: Lavender and gold jars, please.",
      ].join("\n"),
    );
  });

  it("omits blank optional lines and segments", () => {
    const minimalExtras: CustomRequestExtras = {
      productType: "not-sure",
      quantity: "",
      dateNeeded: "",
      occasion: "",
      scentColourNotes: "",
    };

    const prefix = composeCustomRequestPrefix(minimalExtras);

    expect(prefix).toBe(
      ["Custom order request", "Product type: Not sure"].join("\n"),
    );
    expect(prefix).not.toContain("Quantity:");
    expect(prefix).not.toContain("Date needed:");
    expect(prefix).not.toContain("Occasion:");
    expect(prefix).not.toContain("Scent or colour notes:");
  });

  it("omits the product-type line entirely when no product type is chosen", () => {
    const prefix = composeCustomRequestPrefix({
      ...fullExtras,
      productType: "",
    });
    expect(prefix).not.toContain("Product type:");
  });

  it("drops quantity and date needed independently, keeping the one that's set", () => {
    const prefix = composeCustomRequestPrefix({
      ...fullExtras,
      quantity: "",
    });
    expect(prefix).toContain("Date needed: 2026-11-01");
    expect(prefix).not.toContain("Quantity:");
  });
});

describe("composeCustomRequestMessage", () => {
  it("appends the trimmed free-text message after the prefix and a blank line", () => {
    const message = composeCustomRequestMessage(
      fullExtras,
      "Please call to confirm colors.",
    );
    expect(message).toBe(
      `${composeCustomRequestPrefix(fullExtras)}\n\nPlease call to confirm colors.`,
    );
  });

  it("trims surrounding whitespace from the message", () => {
    const message = composeCustomRequestMessage(
      fullExtras,
      "  Spaced out message text.  ",
    );
    expect(message.endsWith("Spaced out message text.")).toBe(true);
    expect(message).not.toContain("  Spaced");
  });

  it("returns the prefix alone when the message is blank", () => {
    const message = composeCustomRequestMessage(fullExtras, "   ");
    expect(message).toBe(composeCustomRequestPrefix(fullExtras));
  });
});

describe("budget sizing (composeCustomRequestPrefix feeding useContactForm's messageMaxLength)", () => {
  it("reserves the prefix's length (plus a 2-char separator margin) out of the server cap", () => {
    const prefix = composeCustomRequestPrefix(fullExtras);
    const budget = Math.max(
      120,
      CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2,
    );
    expect(budget).toBe(CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2);
    expect(budget).toBeGreaterThanOrEqual(120);
    expect(budget).toBeLessThan(CONTACT_MESSAGE_MAX_LENGTH);
  });

  it("floors the live budget at 120 characters when the structured answers are very long", () => {
    const prefix = composeCustomRequestPrefix({
      ...fullExtras,
      occasion: "x".repeat(2000),
    });
    const budget = Math.max(
      120,
      CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2,
    );
    expect(budget).toBe(120);
  });
});
