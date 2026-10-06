import { describe, expect, it, vi } from "vitest";

import type { TemplateListRow } from "~/lib/template-fields";

// Mock server-only modules to prevent database connection errors during
// module imports (umsc-about-page and umsc-footer import db + trpc server)
vi.mock("~/server/db", () => ({
  db: {},
}));
vi.mock("~/trpc/server", () => ({
  api: {},
}));

import { UMSC_CUSTOM_DEFAULT_LINES } from "./homepage/umsc-custom-section";
import { UMSC_ABOUT_DEFAULT_VALUES } from "./about/umsc-about-page";
import { UMSC_SHOP_DEFAULT_DOORS } from "./shop/index";

/**
 * Regression test for the 2026-09-26 migration of umsc's list-field
 * built-in fallback rows from hardcoded `TemplateListRow[]` constants
 * (and plain object arrays) into field-level `defaultRows`, resolved back to
 * components via helper functions. The expected arrays below are the exact
 * pre-migration constant values — copied verbatim from the storefront
 * components before they were rewritten — so this test proves the storefront
 * output is byte-for-byte identical.
 */

function strip(rows: TemplateListRow[]): Array<Omit<TemplateListRow, "_id">> {
  return rows.map(({ _id, ...rest }) => rest);
}

describe("umsc list-field defaults (moving into TemplateField.defaultRows 2026-09-26)", () => {
  it("UMSC_CUSTOM_DEFAULT_LINES (umsc.homepage.custom-list) matches the pre-migration copy", () => {
    const expected: Array<Omit<TemplateListRow, "_id">> = [
      { text: "Candles, wax melts, soaps, or body care" },
      { text: "Bundles, favors, and corporate gifts" },
      { text: "Your scent notes, your colors, your label" },
    ];
    expect(strip(UMSC_CUSTOM_DEFAULT_LINES)).toEqual(expected);
  });

  it("UMSC_ABOUT_DEFAULT_VALUES (umsc.about.values) matches the pre-migration copy", () => {
    const expected: Array<Omit<TemplateListRow, "_id">> = [
      {
        title: "Wellness & Relief",
        body: "Unique Monique prioritizes self-care by fostering a healthier and cleaner environment. Our products are specifically designed to soothe common respiratory issues, such as asthma and allergies, through the use of natural, pollution-free ingredients. Our triple-scented candles, wax melts, and laundry pods create soothing spaces that enhance both physical comfort and mental wellness.",
      },
      {
        title: "Eco-Conscious & Everyday",
        body: "Our commitment to sustainability ensures that our products benefit not only your health but also the environment. Unique Monique uses naturally sourced ingredients and sustainable packaging, allowing you to enjoy effective home-care solutions without environmental guilt. Our antibacterial laundry pods and bleach tablets are user-friendly and eco-friendly, offering busy families a cleaner, greener way to manage household needs without compromise.",
      },
      {
        title: "Community-Driven & Family-Focused",
        body: "As a proud Black woman-owned business, Unique Monique is deeply rooted in community support. Our product range caters to diverse needs — from calming candles for relaxation to convenient, chemical-free cleaning solutions that are gentle on your skin and safe for your airways. We promise quality you can trust for yourself and your family.",
      },
    ];
    expect(strip(UMSC_ABOUT_DEFAULT_VALUES)).toEqual(expected);
  });

  it("UMSC_SHOP_DEFAULT_DOORS (umsc.shop.doors) matches the pre-migration copy", () => {
    const expected: Array<Omit<TemplateListRow, "_id">> = [
      {
        image: "",
        title: "Candles",
        blurb: "Hand-poured soy, small batch.",
        link: "/collections/candles",
      },
      {
        image: "",
        title: "Soaps",
        blurb: "Gentle bars for everyday washing.",
        link: "/collections/soaps",
      },
      {
        image: "",
        title: "Body Care",
        blurb: "Butters and oils for dry skin.",
        link: "/collections/body-care",
      },
      {
        image: "",
        title: "Home Care",
        blurb: "Sprays and melts for every room.",
        link: "/collections/home-care",
      },
    ];
    expect(strip(UMSC_SHOP_DEFAULT_DOORS)).toEqual(expected);
  });
});
