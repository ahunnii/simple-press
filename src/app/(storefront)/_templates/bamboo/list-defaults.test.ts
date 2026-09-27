import { describe, expect, it } from "vitest";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import type { GenericIconRow } from "~/lib/template-fields";

import {
  DEFAULT_BAMBOO_NATIONWIDE_FACTS,
  DEFAULT_BAMBOO_VALUES,
  DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
} from "./about";
import {
  DEFAULT_BAMBOO_FEATURES,
  DEFAULT_BAMBOO_HERO_BADGES,
  DEFAULT_BAMBOO_VALUE_BAND,
} from "./homepage";

/**
 * Regression test for the 2026-09-26 migration of bamboo's list-field
 * built-in fallback rows from hardcoded `GenericIconRow[]` constants (icon
 * *components*) into field-level `defaultRows` (icon *names*), resolved back
 * to components via `iconRowsFromDefaults`. The expected arrays below are the
 * exact pre-migration constant values — copied verbatim from
 * `homepage/index.tsx` / `about/index.tsx` before they were rewritten — so
 * this test proves the storefront output is byte-for-byte identical.
 */

type ExpectedRow = { iconName: string; title: string; description: string };

function expectRowsMatch(actual: GenericIconRow[], expected: ExpectedRow[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((row, index) => {
    const exp = expected[index]!;
    const expectedIcon = getLucideTemplateIcon(exp.iconName);
    expect(
      expectedIcon,
      `expected icon name "${exp.iconName}" (row ${index}) to resolve via getLucideTemplateIcon`,
    ).not.toBeNull();
    expect(row.icon).toBe(expectedIcon);
    expect(row.title).toBe(exp.title);
    expect(row.description).toBe(exp.description);
  });
}

describe("bamboo list-field defaults (moved into TemplateField.defaultRows 2026-09-26)", () => {
  it("DEFAULT_BAMBOO_HERO_BADGES (bamboo.homepage.hero-badges) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_HERO_BADGES, [
      { iconName: "Leaf", title: "Made from 100% Bamboo", description: "" },
      { iconName: "FlaskConical", title: "Chemical Free", description: "" },
      {
        iconName: "ShieldCheck",
        title: "Hypoallergenic & Safe",
        description: "",
      },
      { iconName: "Droplets", title: "Septic Safe", description: "" },
      {
        iconName: "TreePine",
        title: "Tree Free",
        description: "Better for You & Our Planet",
      },
    ]);
  });

  it("DEFAULT_BAMBOO_VALUE_BAND (bamboo.homepage.value-band-items) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_VALUE_BAND, [
      {
        iconName: "Leaf",
        title: "Better for you. Better for our planet.",
        description: "",
      },
      {
        iconName: "Users",
        title: "Safe for your family. Good for every home.",
        description: "",
      },
      {
        iconName: "Heart",
        title: "Supporting communities. Building generational wealth.",
        description: "",
      },
      {
        iconName: "Globe",
        title: "Healthier communities — one roll at a time.",
        description: "",
      },
    ]);
  });

  it("DEFAULT_BAMBOO_FEATURES (bamboo.homepage.sustainability-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_FEATURES, [
      {
        iconName: "CheckCircle",
        title: "Premium Quality",
        description:
          "Experience top-quality household paper products, crafted for comfort and reliability.",
      },
      {
        iconName: "BanknoteArrowDown",
        title: "Competitive Prices",
        description: "Affordable prices without compromising quality.",
      },
      {
        iconName: "Users",
        title: "Customer-Centric Approach",
        description: "Your satisfaction comes first in everything we do.",
      },
    ]);
  });

  it("DEFAULT_BAMBOO_VALUES (bamboo.about.values-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_VALUES, [
      {
        iconName: "Leaf",
        title: "Sustainability First",
        description:
          "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint.",
      },
      {
        iconName: "Heart",
        title: "Premium Quality",
        description:
          "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands.",
      },
      {
        iconName: "Users",
        title: "Community Driven",
        description:
          "We believe in the power of community. We are always here to help you find the perfect product for your needs.",
      },
    ]);
  });

  it("DEFAULT_BAMBOO_WHY_BAMBOO_FACTS (bamboo.about.why-bamboo-facts-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_WHY_BAMBOO_FACTS, [
      {
        iconName: "Sprout",
        title: "Rapid Growth",
        description:
          "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees.",
      },
      {
        iconName: "TreePine",
        title: "No Replanting Needed",
        description:
          "Bamboo regenerates from its own root system after harvest, which means the soil stays intact and carbon continues to be sequestered.",
      },
      {
        iconName: "Droplets",
        title: "Water Efficient",
        description:
          "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.",
      },
    ]);
  });

  it("DEFAULT_BAMBOO_NATIONWIDE_FACTS (bamboo.about.nationwide-facts-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_BAMBOO_NATIONWIDE_FACTS, [
      {
        iconName: "Truck",
        title: "Nationwide Shipping",
        description:
          "We deliver our premium products to doorsteps across the country, carefully packaged and always on time.",
      },
      {
        iconName: "Building2",
        title: "Homes & Businesses",
        description:
          "From your bathroom to bustling restaurants, hotels, schools, and local stores -- we have solutions for every setting.",
      },
      {
        iconName: "ShieldCheck",
        title: "Customer-First Service",
        description:
          "Our dedicated Detroit-based team provides responsive, knowledgeable support for every order and inquiry.",
      },
    ]);
  });
});
