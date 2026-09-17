import { describe, expect, it } from "vitest";

import type { QuoteExtras } from "./compose-quote-message";
import { CONTACT_MESSAGE_MAX_LENGTH } from "~/lib/validators/contact";

import {
  composeQuoteMessage,
  composeQuotePrefix,
} from "./compose-quote-message";

const fullExtras: QuoteExtras = {
  eventDate: "2026-10-04",
  eventTime: "17:00",
  location: "The Grand Hall, Detroit",
  setting: "indoor",
  colors: "Rose gold and ivory",
  draping: "yes",
  throneChair: "no",
  fullDecor: "yes",
  photoLink: "https://example.com/venue-photos",
};

describe("composeQuotePrefix", () => {
  it("renders every line, in order, when every extra is filled in", () => {
    const prefix = composeQuotePrefix(fullExtras);
    expect(prefix).toBe(
      [
        "Estimate Quote request",
        "Event date: 2026-10-04 · Event time: 17:00",
        "Location: The Grand Hall, Detroit · Setting: Indoor",
        "Colors: Rose gold and ivory",
        "Draping: Yes · Throne chair: No · Full decor by Dream Your Theme: Yes",
        "Event-space photos: https://example.com/venue-photos",
      ].join("\n"),
    );
  });

  it("omits blank optional lines and segments", () => {
    const minimalExtras: QuoteExtras = {
      eventDate: "2026-10-04",
      eventTime: "",
      location: "The Grand Hall, Detroit",
      setting: "outdoor",
      colors: "",
      draping: "",
      throneChair: "",
      fullDecor: "unsure",
      photoLink: "",
    };

    const prefix = composeQuotePrefix(minimalExtras);

    expect(prefix).toBe(
      [
        "Estimate Quote request",
        "Event date: 2026-10-04",
        "Location: The Grand Hall, Detroit · Setting: Outdoor",
        "Full decor by Dream Your Theme: Not sure",
      ].join("\n"),
    );
    expect(prefix).not.toContain("Colors:");
    expect(prefix).not.toContain("Event-space photos:");
    expect(prefix).not.toContain("Draping:");
    expect(prefix).not.toContain("Throne chair:");
    expect(prefix).not.toContain("Event time:");
  });

  it("drops individual decor segments independently, keeping the ones that are set", () => {
    const prefix = composeQuotePrefix({
      ...fullExtras,
      draping: "",
      throneChair: "unsure",
    });
    expect(prefix).toContain(
      "Throne chair: Not sure · Full decor by Dream Your Theme: Yes",
    );
    expect(prefix).not.toContain("Draping:");
  });
});

describe("composeQuoteMessage", () => {
  it("appends the trimmed free-text theme after the prefix and a blank line", () => {
    const message = composeQuoteMessage(
      fullExtras,
      "A midnight garden with fairy lights.",
    );
    expect(message).toBe(
      `${composeQuotePrefix(fullExtras)}\n\nTheme: A midnight garden with fairy lights.`,
    );
  });

  it("trims surrounding whitespace from the theme text", () => {
    const message = composeQuoteMessage(
      fullExtras,
      "  Spaced out theme text.  ",
    );
    expect(message.endsWith("Theme: Spaced out theme text.")).toBe(true);
  });
});

describe("budget sizing (composeQuotePrefix feeding useContactForm's messageMaxLength)", () => {
  it("reserves the prefix's length (plus a 2-char separator margin) out of the server cap", () => {
    const prefix = composeQuotePrefix(fullExtras);
    const budget = Math.max(
      120,
      CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2,
    );
    expect(budget).toBe(CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2);
    expect(budget).toBeGreaterThanOrEqual(120);
    expect(budget).toBeLessThan(CONTACT_MESSAGE_MAX_LENGTH);
  });

  it("floors the live budget at 120 characters when the structured answers are very long", () => {
    const prefix = composeQuotePrefix({
      ...fullExtras,
      location: "x".repeat(2000),
    });
    const budget = Math.max(
      120,
      CONTACT_MESSAGE_MAX_LENGTH - prefix.length - 2,
    );
    expect(budget).toBe(120);
  });
});
