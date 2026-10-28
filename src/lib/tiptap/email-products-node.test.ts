import type { JSONContent } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import type { EmailProductItem } from "./email-products-node";

import {
  coerceEmailProductsButtonLabel,
  DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL,
  EMAIL_PRODUCTS_MAX,
  EmailProducts,
  parseEmailProductItemsAttr,
  sanitizeEmailProductItems,
} from "./email-products-node";

const item = (
  overrides: Partial<Record<keyof EmailProductItem, unknown>> = {},
): Record<string, unknown> => ({
  productId: "p1",
  name: "Linen apron",
  imageUrl: "https://cdn.example.com/apron.jpg",
  priceCents: 2400,
  compareAtCents: 3000,
  slug: "linen-apron",
  ...overrides,
});

describe("sanitizeEmailProductItems", () => {
  it("keeps well-formed items as they are", () => {
    expect(sanitizeEmailProductItems([item()])).toEqual([item()]);
  });

  it.each([undefined, null, "[]", 4, { items: [] }])(
    "returns no items for a non-array (%j)",
    (raw) => {
      expect(sanitizeEmailProductItems(raw)).toEqual([]);
    },
  );

  it("drops entries that fail the shape check", () => {
    const good = item({ productId: "ok", slug: "ok" });
    expect(
      sanitizeEmailProductItems([
        null,
        "p1",
        item({ productId: "" }),
        item({ productId: 7 }),
        item({ name: "   " }),
        item({ slug: "" }),
        item({ priceCents: -1 }),
        item({ priceCents: "24.00" }),
        item({ priceCents: Number.NaN }),
        good,
      ]),
    ).toEqual([good]);
  });

  it(`caps the list at ${EMAIL_PRODUCTS_MAX} and drops repeats`, () => {
    const many = ["a", "a", "b", "c", "d", "e"].map((id) =>
      item({ productId: id, slug: id }),
    );
    expect(
      sanitizeEmailProductItems(many).map((entry) => entry.productId),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("normalizes optional fields", () => {
    expect(
      sanitizeEmailProductItems([
        item({
          name: "  Apron  ",
          imageUrl: "",
          priceCents: 2399.6,
          compareAtCents: "3000",
        }),
      ]),
    ).toEqual([
      {
        productId: "p1",
        name: "Apron",
        imageUrl: null,
        priceCents: 2400,
        compareAtCents: null,
        slug: "linen-apron",
      },
    ]);
  });

  it("drops a compare-at price that isn't above the price", () => {
    const [same] = sanitizeEmailProductItems([
      item({ priceCents: 2400, compareAtCents: 2400 }),
    ]);
    expect(same?.compareAtCents).toBeNull();
  });
});

describe("parseEmailProductItemsAttr", () => {
  it("parses and sanitizes JSON", () => {
    expect(parseEmailProductItemsAttr(JSON.stringify([item()]))).toEqual([
      item(),
    ]);
  });

  it.each([null, "", "not json", "{", '{"a":1}'])(
    "returns no items for %j",
    (value) => {
      expect(parseEmailProductItemsAttr(value)).toEqual([]);
    },
  );
});

describe("coerceEmailProductsButtonLabel", () => {
  it("collapses whitespace and caps the length", () => {
    expect(coerceEmailProductsButtonLabel("  Buy   now ")).toBe("Buy now");
    expect(coerceEmailProductsButtonLabel("x".repeat(60))).toHaveLength(40);
  });

  it.each([undefined, null, "", "   ", 3])(
    "falls back to the default for %j",
    (value) => {
      expect(coerceEmailProductsButtonLabel(value)).toBe(
        DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL,
      );
    },
  );
});

describe("emailProducts HTML round trip", () => {
  const extensions = [StarterKit, EmailProducts];
  const doc = (attrs: Record<string, unknown>): JSONContent => ({
    type: "doc",
    content: [{ type: "emailProducts", attrs }],
  });

  it("serializes items and label as data attributes and parses them back", () => {
    const html = generateHTML(
      doc({ items: [item()], buttonLabel: "Get yours" }),
      extensions,
    );
    expect(html).toContain('data-type="email-products"');
    expect(html).toContain('data-button-label="Get yours"');

    const json = generateJSON(html, extensions) as JSONContent;
    expect(json.content?.[0]).toEqual({
      type: "emailProducts",
      attrs: { items: [item()], buttonLabel: "Get yours" },
    });
  });

  it("parses bad data-items as no items", () => {
    const json = generateJSON(
      '<div data-type="email-products" data-items="{oops" data-button-label=""></div>',
      extensions,
    ) as JSONContent;
    expect(json.content?.[0]).toEqual({
      type: "emailProducts",
      attrs: { items: [], buttonLabel: DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL },
    });
  });
});
