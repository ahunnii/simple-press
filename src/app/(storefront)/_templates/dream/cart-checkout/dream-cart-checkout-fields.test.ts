import { describe, expect, it } from "vitest";

import {
  dreamShopData,
  dreamShopFieldGroups,
  dreamShopSections,
} from "../shop";
import { dreamPageWindow } from "../shop/dream-shop-filter-client";
import { resolveDreamCheckoutCopy } from "./dream-checkout-copy";
import { resolveDreamOrderSteps } from "./dream-order-steps";
import {
  dreamCartCheckoutData,
  dreamCartCheckoutFieldGroups,
  dreamCartCheckoutSections,
} from "./index";
import {
  dreamCheckoutUnavailableData,
  dreamCheckoutUnavailableSections,
} from "./unavailable-fields";

const DOMAINS = [
  {
    name: "cart-checkout",
    data: dreamCartCheckoutData,
    groups: dreamCartCheckoutFieldGroups,
    sections: dreamCartCheckoutSections,
  },
  {
    name: "shop",
    data: dreamShopData,
    groups: dreamShopFieldGroups,
    sections: dreamShopSections,
  },
];

describe.each(DOMAINS)("dream $name fields", ({ data, groups, sections }) => {
  it("keys are unique, dream-prefixed, and page-scoped", () => {
    const keys = data.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of data) {
      expect(field.key.startsWith(`dream.`)).toBe(true);
      expect(field.group?.startsWith(`${field.page}.`)).toBe(true);
    }
  });

  it("triple-match: every field group has one section with the same id, page, and title", () => {
    for (const group of groups) {
      const section = sections.find((s) => s.id === group.id);
      expect(section, group.id).toBeDefined();
      expect(section?.groupIds).toEqual([group.id]);
      expect(section?.title).toBe(group.title);
      expect(group.id.startsWith(`${section?.page}.`)).toBe(true);
    }
    for (const field of data) {
      expect(groups.some((g) => g.id === field.group)).toBe(true);
    }
  });

  it("list fields declare their built-in rows", () => {
    for (const field of data) {
      if (field.type !== "list") continue;
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultRows?.length).toBeGreaterThan(0);
      expect(field.itemLabel).toBeTruthy();
    }
  });
});

describe("cart-checkout vs checkout-unavailable", () => {
  it("never reuses an unavailable-fields key or section id", () => {
    const unavailableKeys = new Set(
      dreamCheckoutUnavailableData.map((f) => f.key),
    );
    for (const field of dreamCartCheckoutData) {
      expect(unavailableKeys.has(field.key)).toBe(false);
    }
    const ids = new Set(dreamCheckoutUnavailableSections.map((s) => s.id));
    for (const section of dreamCartCheckoutSections) {
      expect(ids.has(section.id)).toBe(false);
    }
  });
});

describe("resolveDreamCheckoutCopy", () => {
  it("keeps the tax note and payment label when saved blank (B8.7)", () => {
    const copy = resolveDreamCheckoutCopy({
      "dream.checkout.tax-note": "",
      "dream.checkout.submit-label": "  ",
      "dream.checkout.address-note": "",
    });
    expect(copy.taxNote).toMatch(/tax/i);
    expect(copy.submitLabel).toBe("Continue to payment");
    // Optional notes still hide when cleared.
    expect(copy.addressNote).toBe("");
  });
});

describe("resolveDreamOrderSteps", () => {
  it("falls back to built-in rows and honours a saved list", () => {
    const steps = resolveDreamOrderSteps({
      "dream.checkout.confirmation-pickup-steps": [
        { heading: "Come by", body: "Saturdays only." },
      ],
    });
    expect(steps.ship.steps.length).toBe(3);
    expect(steps.pickup.steps).toEqual([
      { heading: "Come by", body: "Saturdays only.", index: 0 },
    ]);
    expect(steps.pickup.fieldKey).toBe(
      "dream.checkout.confirmation-pickup-steps",
    );
  });
});

describe("dreamPageWindow", () => {
  it("windows long page runs with gaps", () => {
    expect(dreamPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(dreamPageWindow(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(dreamPageWindow(1, 12)).toEqual([1, 2, "gap", 12]);
  });
});
