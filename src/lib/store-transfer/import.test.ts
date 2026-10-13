/**
 * Pure helpers for the store-transfer option-group import. `~/server/db` is
 * mocked (import.ts imports it), so this runs in the `unit` project with no
 * Postgres.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({ db: {} }));

const {
  resolveOptionValueLinks,
  sanitizeOptionGroupNumbers,
  sanitizeOptionPrice,
  sanitizeOptionValuePrices,
} = await import("./import");
const { OPTION_PRICE_MAX_CENTS } = await import(
  "~/lib/validators/product-options"
);
const { CUSTOMIZER_MAX_VALUES_PER_GROUP, CUSTOMIZER_TEXT_MAX_LENGTH } =
  await import("~/lib/customizer/types");

describe("sanitizeOptionPrice", () => {
  it("keeps in-range whole cents", () => {
    expect(sanitizeOptionPrice(0)).toBe(0);
    expect(sanitizeOptionPrice(250)).toBe(250);
    expect(sanitizeOptionPrice(OPTION_PRICE_MAX_CENTS)).toBe(
      OPTION_PRICE_MAX_CENTS,
    );
  });

  it("clamps negatives to 0", () => {
    expect(sanitizeOptionPrice(-1)).toBe(0);
    expect(sanitizeOptionPrice(-500)).toBe(0);
  });

  it("clamps above the admin maximum", () => {
    expect(sanitizeOptionPrice(OPTION_PRICE_MAX_CENTS + 1)).toBe(
      OPTION_PRICE_MAX_CENTS,
    );
    expect(sanitizeOptionPrice(Number.MAX_SAFE_INTEGER)).toBe(
      OPTION_PRICE_MAX_CENTS,
    );
  });

  it("rounds fractional cents", () => {
    expect(sanitizeOptionPrice(99.6)).toBe(100);
    expect(sanitizeOptionPrice(99.4)).toBe(99);
  });
});

describe("sanitizeOptionGroupNumbers", () => {
  it("leaves a valid choice group untouched", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: 1,
      maxSelections: 3,
      includedCount: 1,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(out.changed).toBe(false);
    expect(out.value).toEqual({
      kind: "choice",
      minSelections: 1,
      maxSelections: 3,
      includedCount: 1,
      maxLength: null,
      textPriceCents: 0,
    });
  });

  it("clamps maxSelections to at least 1 and minSelections to 0..max", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: -4,
      maxSelections: 0,
      includedCount: 0,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(out.changed).toBe(true);
    expect(out.value.maxSelections).toBe(1);
    expect(out.value.minSelections).toBe(0);
  });

  it("clamps minSelections down to maxSelections", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: 5,
      maxSelections: 2,
      includedCount: 0,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(out.value.minSelections).toBe(2);
    expect(out.value.maxSelections).toBe(2);
    expect(out.changed).toBe(true);
  });

  it("clamps includedCount into 0..maxSelections", () => {
    const high = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: 0,
      maxSelections: 2,
      includedCount: 9,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(high.value.includedCount).toBe(2);

    const low = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: 0,
      maxSelections: 2,
      includedCount: -3,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(low.value.includedCount).toBe(0);
    expect(low.changed).toBe(true);
  });

  it("caps maxSelections at the admin per-group limit", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "choice",
      minSelections: 0,
      maxSelections: 10_000,
      includedCount: 0,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(out.value.maxSelections).toBe(CUSTOMIZER_MAX_VALUES_PER_GROUP);
  });

  it("clamps maxLength to >= 1 when set, and keeps null", () => {
    const negative = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: -10,
      textPriceCents: 0,
    });
    expect(negative.value.maxLength).toBe(1);
    expect(negative.changed).toBe(true);

    const zero = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: 0,
      textPriceCents: 0,
    });
    expect(zero.value.maxLength).toBe(1);
    expect(zero.changed).toBe(true);

    const unset = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: null,
      textPriceCents: 0,
    });
    expect(unset.value.maxLength).toBeNull();
    expect(unset.changed).toBe(false);
  });

  it("caps maxLength at the customizer text limit", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: CUSTOMIZER_TEXT_MAX_LENGTH + 1,
      textPriceCents: 0,
    });
    expect(out.value.maxLength).toBe(CUSTOMIZER_TEXT_MAX_LENGTH);
  });

  it("resets text groups to the admin's text-kind numbers", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 2,
      maxSelections: 5,
      includedCount: 1,
      maxLength: 40,
      textPriceCents: 150,
    });
    expect(out.changed).toBe(true);
    expect(out.value).toEqual({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: 40,
      textPriceCents: 150,
    });
  });

  it("does not flag a text group already in admin shape", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: 40,
      textPriceCents: 150,
    });
    expect(out.changed).toBe(false);
  });

  it("clamps a negative textPriceCents to 0", () => {
    const out = sanitizeOptionGroupNumbers({
      kind: "text",
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      maxLength: null,
      textPriceCents: -700,
    });
    expect(out.value.textPriceCents).toBe(0);
    expect(out.changed).toBe(true);
  });
});

describe("resolveOptionValueLinks", () => {
  const productMap = new Map([["prod_old", "prod_new"]]);
  const variantMap = new Map([["var_old", "var_new"]]);

  it("keeps a product link and a variant link that both imported", () => {
    expect(
      resolveOptionValueLinks(
        { exportLinkedProductId: "prod_old", exportLinkedVariantId: "var_old" },
        productMap,
        variantMap,
      ),
    ).toEqual({
      linkedProductId: "prod_new",
      linkedVariantId: "var_new",
      linkDropped: false,
    });
  });

  it("drops a variant link that has no exportLinkedProductId", () => {
    expect(
      resolveOptionValueLinks(
        { exportLinkedProductId: null, exportLinkedVariantId: "var_old" },
        productMap,
        variantMap,
      ),
    ).toEqual({
      linkedProductId: null,
      linkedVariantId: null,
      linkDropped: true,
    });
  });

  it("drops the variant too when a linked product did not import", () => {
    expect(
      resolveOptionValueLinks(
        { exportLinkedProductId: "prod_gone", exportLinkedVariantId: "var_old" },
        productMap,
        variantMap,
      ),
    ).toEqual({
      linkedProductId: null,
      linkedVariantId: null,
      linkDropped: true,
    });
  });

  it("leaves an unlinked value alone", () => {
    expect(resolveOptionValueLinks({}, productMap, variantMap)).toEqual({
      linkedProductId: null,
      linkedVariantId: null,
      linkDropped: false,
    });
  });

  it("a variant-only link also clears priceOverride downstream", () => {
    const links = resolveOptionValueLinks(
      { exportLinkedProductId: null, exportLinkedVariantId: "var_old" },
      productMap,
      variantMap,
    );
    const prices = sanitizeOptionValuePrices(
      { priceDelta: 0, priceOverride: 900 },
      links.linkedProductId !== null,
    );
    expect(prices.priceOverride).toBeNull();
  });
});

describe("sanitizeOptionValuePrices", () => {
  it("keeps valid prices on a linked value", () => {
    expect(
      sanitizeOptionValuePrices({ priceDelta: 300, priceOverride: 1200 }, true),
    ).toEqual({ priceDelta: 300, priceOverride: 1200, changed: false });
  });

  it("clamps a negative priceDelta and keeps a negative one out of the DB", () => {
    expect(
      sanitizeOptionValuePrices({ priceDelta: -250, priceOverride: null }, true),
    ).toEqual({ priceDelta: 0, priceOverride: null, changed: true });
  });

  it("drops priceOverride when the value has no linked product", () => {
    const out = sanitizeOptionValuePrices(
      { priceDelta: 0, priceOverride: 900 },
      false,
    );
    expect(out.priceOverride).toBeNull();
    expect(out.changed).toBe(true);
  });

  it("does not flag an unlinked value that already has no override", () => {
    const out = sanitizeOptionValuePrices(
      { priceDelta: 0, priceOverride: undefined },
      false,
    );
    expect(out).toEqual({ priceDelta: 0, priceOverride: null, changed: false });
  });

  it("clamps an out-of-range priceOverride on a linked value", () => {
    const out = sanitizeOptionValuePrices(
      { priceDelta: 0, priceOverride: OPTION_PRICE_MAX_CENTS + 5 },
      true,
    );
    expect(out.priceOverride).toBe(OPTION_PRICE_MAX_CENTS);
    expect(out.changed).toBe(true);
  });

  it("clamps an over-large priceDelta", () => {
    const out = sanitizeOptionValuePrices(
      { priceDelta: OPTION_PRICE_MAX_CENTS * 3, priceOverride: null },
      false,
    );
    expect(out.priceDelta).toBe(OPTION_PRICE_MAX_CENTS);
    expect(out.changed).toBe(true);
  });
});
