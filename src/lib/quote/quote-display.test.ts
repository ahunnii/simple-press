import { describe, expect, it } from "vitest";

import {
  coerceQuoteDensity,
  coerceQuoteHeight,
  coerceQuoteWidth,
  QUOTE_DENSITY_PRESETS,
  QUOTE_DISPLAY_DEFAULTS,
  QUOTE_HEIGHT_PRESETS,
  QUOTE_WIDTH_PRESETS,
  quoteDensityClasses,
  quoteHeightClass,
  quoteWidthClass,
} from "./quote-display";

describe("coerceQuoteWidth", () => {
  it("accepts every valid width value", () => {
    expect(coerceQuoteWidth("full")).toBe("full");
    expect(coerceQuoteWidth("large")).toBe("large");
    expect(coerceQuoteWidth("medium")).toBe("medium");
    expect(coerceQuoteWidth("small")).toBe("small");
  });

  it("returns undefined for unknown or missing input", () => {
    expect(coerceQuoteWidth(undefined)).toBeUndefined();
    expect(coerceQuoteWidth(null)).toBeUndefined();
    expect(coerceQuoteWidth("")).toBeUndefined();
    expect(coerceQuoteWidth("huge")).toBeUndefined();
    expect(coerceQuoteWidth(42)).toBeUndefined();
  });
});

describe("coerceQuoteHeight", () => {
  it("accepts every valid height value", () => {
    expect(coerceQuoteHeight("auto")).toBe("auto");
    expect(coerceQuoteHeight("short")).toBe("short");
    expect(coerceQuoteHeight("medium")).toBe("medium");
    expect(coerceQuoteHeight("tall")).toBe("tall");
  });

  it("returns undefined for unknown or missing input", () => {
    expect(coerceQuoteHeight(undefined)).toBeUndefined();
    expect(coerceQuoteHeight(null)).toBeUndefined();
    expect(coerceQuoteHeight("")).toBeUndefined();
    expect(coerceQuoteHeight("massive")).toBeUndefined();
    expect(coerceQuoteHeight({})).toBeUndefined();
  });
});

describe("coerceQuoteDensity", () => {
  it("accepts every valid density value", () => {
    expect(coerceQuoteDensity("compact")).toBe("compact");
    expect(coerceQuoteDensity("comfortable")).toBe("comfortable");
    expect(coerceQuoteDensity("spacious")).toBe("spacious");
  });

  it("returns undefined for unknown or missing input", () => {
    expect(coerceQuoteDensity(undefined)).toBeUndefined();
    expect(coerceQuoteDensity(null)).toBeUndefined();
    expect(coerceQuoteDensity("")).toBeUndefined();
    expect(coerceQuoteDensity("roomy")).toBeUndefined();
    expect(coerceQuoteDensity(1)).toBeUndefined();
  });
});

describe("quoteWidthClass", () => {
  it("maps each preset to its Tailwind max-w class", () => {
    expect(quoteWidthClass("large")).toBe("max-w-4xl");
    expect(quoteWidthClass("medium")).toBe("max-w-2xl");
    expect(quoteWidthClass("small")).toBe("max-w-md");
  });

  it("returns an empty string for full, undefined, and unrecognised values", () => {
    expect(quoteWidthClass("full")).toBe("");
    expect(quoteWidthClass(undefined)).toBe("");
    expect(quoteWidthClass("gigantic")).toBe("");
  });
});

describe("quoteHeightClass", () => {
  it("maps each preset to its Tailwind min-h class", () => {
    expect(quoteHeightClass("short")).toBe("min-h-[22rem]");
    expect(quoteHeightClass("medium")).toBe("min-h-[30rem]");
    expect(quoteHeightClass("tall")).toBe("min-h-[38rem]");
  });

  it("returns an empty string for auto, undefined, and unrecognised values", () => {
    expect(quoteHeightClass("auto")).toBe("");
    expect(quoteHeightClass(undefined)).toBe("");
    expect(quoteHeightClass("towering")).toBe("");
  });
});

describe("quoteDensityClasses", () => {
  const comfortable = {
    card: "p-4 sm:p-6",
    heading: "text-lg sm:text-xl",
    body: "space-y-4",
    optionCard: "p-4",
    optionGap: "gap-3",
    fieldGap: "gap-4",
  };

  it("resolves comfortable to today's literal classes", () => {
    expect(quoteDensityClasses("comfortable")).toEqual(comfortable);
  });

  it("resolves undefined and unrecognised values to the same comfortable defaults", () => {
    expect(quoteDensityClasses(undefined)).toEqual(comfortable);
    expect(quoteDensityClasses("roomy")).toEqual(comfortable);
  });

  it("resolves compact to tighter classes", () => {
    expect(quoteDensityClasses("compact")).toEqual({
      card: "p-3 sm:p-4",
      heading: "text-base sm:text-lg",
      body: "space-y-3",
      optionCard: "p-3",
      optionGap: "gap-2",
      fieldGap: "gap-3",
    });
  });

  it("resolves spacious to looser classes", () => {
    expect(quoteDensityClasses("spacious")).toEqual({
      card: "p-6 sm:p-10",
      heading: "text-xl sm:text-2xl",
      body: "space-y-6",
      optionCard: "p-5",
      optionGap: "gap-4",
      fieldGap: "gap-5",
    });
  });
});

describe("preset arrays", () => {
  it("QUOTE_WIDTH_PRESETS is ordered full, large, medium, small", () => {
    expect(QUOTE_WIDTH_PRESETS.map((p) => p.value)).toEqual([
      "full",
      "large",
      "medium",
      "small",
    ]);
  });

  it("QUOTE_HEIGHT_PRESETS is ordered auto, short, medium, tall", () => {
    expect(QUOTE_HEIGHT_PRESETS.map((p) => p.value)).toEqual([
      "auto",
      "short",
      "medium",
      "tall",
    ]);
  });

  it("QUOTE_DENSITY_PRESETS is ordered compact, comfortable, spacious", () => {
    expect(QUOTE_DENSITY_PRESETS.map((p) => p.value)).toEqual([
      "compact",
      "comfortable",
      "spacious",
    ]);
  });
});

describe("QUOTE_DISPLAY_DEFAULTS", () => {
  it("matches today's look (full width, auto height, comfortable density)", () => {
    expect(QUOTE_DISPLAY_DEFAULTS).toEqual({
      width: "full",
      height: "auto",
      density: "comfortable",
    });
  });
});
