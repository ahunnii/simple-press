import { describe, expect, it } from "vitest";

import { TEMPLATES } from "~/lib/constants";

import {
  contrastRatio,
  EMAIL_FONT_STACKS,
  getTemplateEmailDefaults,
  parseEmailStyle,
  relativeLuminance,
  resolveEmailStyle,
} from "./email-style";

describe("parseEmailStyle", () => {
  it("accepts a partial style and lowercases hex", () => {
    expect(
      parseEmailStyle({ accent: " #ABCDEF ", footerNote: "  hi  " }),
    ).toEqual({ accent: "#abcdef", footerNote: "hi" });
  });

  it("returns {} for bad hex", () => {
    expect(parseEmailStyle({ accent: "#fff" })).toEqual({});
    expect(parseEmailStyle({ pageBackground: "red" })).toEqual({});
    expect(parseEmailStyle({ accent: "#12345g" })).toEqual({});
  });

  it("returns {} for unknown keys, bad enums, long notes and non-objects", () => {
    expect(parseEmailStyle({ accent: "#112233", bogus: 1 })).toEqual({});
    expect(parseEmailStyle({ font: "mono" })).toEqual({});
    expect(parseEmailStyle({ footerNote: "x".repeat(201) })).toEqual({});
    expect(parseEmailStyle(null)).toEqual({});
    expect(parseEmailStyle("nope")).toEqual({});
    expect(parseEmailStyle(undefined)).toEqual({});
  });
});

describe("resolveEmailStyle", () => {
  it("uses the default template's look for unknown, null and undefined ids", () => {
    const base = resolveEmailStyle({ emailStyle: null, templateId: "default" });
    expect(resolveEmailStyle({ emailStyle: null, templateId: "nope" })).toEqual(
      base,
    );
    expect(resolveEmailStyle({ emailStyle: null, templateId: null })).toEqual(
      base,
    );
    expect(
      resolveEmailStyle({ emailStyle: {}, templateId: undefined }),
    ).toEqual(base);
    expect(base).toMatchObject({
      accent: "#111827",
      pageBackground: "#f6f9fc",
      font: "sans",
      header: "logo-center",
      logoSize: "md",
      showSocial: true,
      footerNote: "",
      fontStack: EMAIL_FONT_STACKS.sans,
      logoHeight: 56,
    });
  });

  it("resolves template defaults", () => {
    expect(
      resolveEmailStyle({ emailStyle: null, templateId: "olive" }),
    ).toMatchObject({
      accent: "#1f1b17",
      pageBackground: "#f7f4ed",
      font: "serif",
    });
    expect(
      resolveEmailStyle({ emailStyle: null, templateId: "modern" }),
    ).toMatchObject({ accent: "#111827", pageBackground: "#f6f9fc" });
  });

  it("merges a saved partial over the template defaults", () => {
    const r = resolveEmailStyle({
      emailStyle: { accent: "#FF0000", logoSize: "lg", showSocial: false },
      templateId: "olive",
    });
    expect(r.accent).toBe("#ff0000");
    expect(r.logoHeight).toBe(72);
    expect(r.showSocial).toBe(false);
    expect(r.pageBackground).toBe("#f7f4ed");
    expect(r.font).toBe("serif");
    expect(r.fontStack).toBe(EMAIL_FONT_STACKS.serif);
  });

  it("falls back entirely to defaults when the saved style is invalid", () => {
    const r = resolveEmailStyle({
      emailStyle: { accent: "nope" },
      templateId: "dream",
    });
    expect(r.accent).toBe("#2b211d");
  });

  it("picks black button text for a light accent and white for a dark one", () => {
    expect(
      resolveEmailStyle({
        emailStyle: { accent: "#fef08a" },
        templateId: "default",
      }).buttonText,
    ).toBe("#111111");
    expect(
      resolveEmailStyle({
        emailStyle: { accent: "#111827" },
        templateId: "default",
      }).buttonText,
    ).toBe("#ffffff");
  });

  it("uses a dark link color when the accent fails 4.5:1 on white", () => {
    expect(
      resolveEmailStyle({
        emailStyle: { accent: "#fef08a" },
        templateId: "default",
      }).linkColor,
    ).toBe("#1f2937");
    expect(
      resolveEmailStyle({
        emailStyle: { accent: "#111827" },
        templateId: "default",
      }).linkColor,
    ).toBe("#111827");
  });
});

describe("contrast helpers", () => {
  it("matches known WCAG values", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("template email defaults", () => {
  it("every template has valid defaults", () => {
    for (const t of TEMPLATES) {
      const d = getTemplateEmailDefaults(t.id);
      expect(d.accent, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(d.pageBackground, t.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(["sans", "serif"], t.id).toContain(d.font);
      // The outer background is never dark.
      expect(relativeLuminance(d.pageBackground), t.id).toBeGreaterThan(0.75);
    }
  });

  it("default and modern keep today's neutral look", () => {
    for (const id of ["default", "modern"]) {
      expect(getTemplateEmailDefaults(id)).toEqual({
        accent: "#111827",
        pageBackground: "#f6f9fc",
        font: "sans",
      });
    }
  });
});
