import { describe, expect, it } from "vitest";

import {
  getSpMeta,
  getTextWidth,
  setSectionHidden,
  setTextWidth,
  setThemeSelection,
  textWidthCssValue,
} from "./sp-meta";

describe("getSpMeta layout guard", () => {
  it("returns no layout when absent or malformed", () => {
    expect(getSpMeta(null).layout).toBeUndefined();
    expect(getSpMeta({}).layout).toBeUndefined();
    expect(getSpMeta({ _sp: {} }).layout).toBeUndefined();
    expect(getSpMeta({ _sp: { layout: "wide" } }).layout).toBeUndefined();
    expect(getSpMeta({ _sp: { layout: [] } }).layout).toBeUndefined();
    expect(getSpMeta({ _sp: { layout: {} } }).layout).toBeUndefined();
  });

  it("rejects unknown or non-string text widths", () => {
    expect(
      getSpMeta({ _sp: { layout: { textWidth: "huge" } } }).layout,
    ).toBeUndefined();
    expect(
      getSpMeta({ _sp: { layout: { textWidth: 960 } } }).layout,
    ).toBeUndefined();
  });

  it("keeps valid text widths", () => {
    expect(
      getSpMeta({ _sp: { layout: { textWidth: "roomy" } } }).layout,
    ).toEqual({ textWidth: "roomy" });
    expect(
      getSpMeta({ _sp: { layout: { textWidth: "full" } } }).layout,
    ).toEqual({ textWidth: "full" });
  });
});

describe("getTextWidth", () => {
  it("defaults to readable", () => {
    expect(getTextWidth(undefined)).toBe("readable");
    expect(getTextWidth({ _sp: { layout: { textWidth: "bogus" } } })).toBe(
      "readable",
    );
  });

  it("reads a stored value", () => {
    expect(getTextWidth({ _sp: { layout: { textWidth: "full" } } })).toBe(
      "full",
    );
  });
});

describe("textWidthCssValue", () => {
  it("maps choices to CSS, and null for the template default", () => {
    expect(textWidthCssValue("readable")).toBeNull();
    expect(textWidthCssValue("roomy")).toBe("960px");
    expect(textWidthCssValue("full")).toBe("none");
  });
});

describe("setTextWidth", () => {
  it("sets a value, preserving other keys and _sp content", () => {
    const base = setThemeSelection(
      setSectionHidden({ "homepage.title": "Hi" }, "homepage.hero", true),
      "palette",
      "sage",
    );
    const next = setTextWidth(base, "roomy");
    expect(next["homepage.title"]).toBe("Hi");
    const meta = getSpMeta(next);
    expect(meta.layout).toEqual({ textWidth: "roomy" });
    expect(meta.sections).toEqual({ "homepage.hero": { hidden: true } });
    expect(meta.theme).toEqual({ palette: "sage" });
  });

  it("does not mutate its input", () => {
    const base = { _sp: { theme: { palette: "a" } } };
    const snapshot = JSON.stringify(base);
    setTextWidth(base, "full");
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("clears on undefined or readable and drops the empty layout", () => {
    const withFull = setTextWidth({}, "full");
    for (const v of [undefined, "readable"] as const) {
      const cleared = setTextWidth(withFull, v);
      expect(getTextWidth(cleared)).toBe("readable");
      expect((cleared._sp as Record<string, unknown>).layout).toBeUndefined();
    }
  });

  it("keeps unrelated layout keys when clearing the text width", () => {
    const cleared = setTextWidth(
      { _sp: { layout: { textWidth: "full", other: 1 } } },
      undefined,
    );
    expect((cleared._sp as { layout: unknown }).layout).toEqual({ other: 1 });
  });

  it("recovers from a malformed _sp", () => {
    expect(getTextWidth(setTextWidth({ _sp: "junk" }, "roomy"))).toBe("roomy");
    expect(getTextWidth(setTextWidth({ _sp: { layout: 5 } }, "full"))).toBe(
      "full",
    );
  });
});
