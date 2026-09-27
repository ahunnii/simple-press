import { describe, expect, it } from "vitest";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import type { GenericIconRow } from "~/lib/template-fields";
import { parseTemplateIconListRows } from "~/lib/template-fields";

import { parseHappyBambooBenefitsList } from "./homepage/happy-bamboo-benefits-data";
import {
  DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST,
  DEFAULT_HAPPY_BAMBOO_SERVICES_LIST,
} from "./index";

/**
 * Regression test for migrating happy-bamboo's list-field built-in fallback
 * rows into field-level `defaultRows`, following the bamboo pilot
 * (`_templates/bamboo/list-defaults.test.ts`). The expected arrays below are
 * the exact pre-migration values — copied verbatim from
 * `homepage/happy-bamboo-benefits-data.ts` (`defaultBenefits()`) and
 * `index.tsx` (`DEFAULT_HAPPY_BAMBOO_SERVICES_LIST` /
 * `DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST`) before they were rewritten — so this
 * test proves the storefront output is byte-for-byte identical after the
 * migration.
 */

type ExpectedRow = { iconName: string; title: string; description: string };

function expectRowsMatch(
  actual: GenericIconRow[] | null,
  expected: ExpectedRow[],
) {
  expect(actual).not.toBeNull();
  const rows = actual!;
  expect(rows).toHaveLength(expected.length);
  rows.forEach((row, index) => {
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

const BENEFITS_EXPECTED: ExpectedRow[] = [
  {
    iconName: "TreePine",
    title: "Sustainability",
    description:
      "Bamboo is one of the fastest-growing plants in the world, capable of reaching maturity in just 3-5 years. It can be harvested without killing the plant, allowing it to regenerate quickly.",
  },
  {
    iconName: "Recycle",
    title: "Biodegradable",
    description:
      "Bamboo products are biodegradable, meaning they break down naturally and do not contribute to landfill waste, unlike many plastic products.",
  },
  {
    iconName: "Wind",
    title: "Carbon Sequestration",
    description:
      "Bamboo absorbs more carbon dioxide and releases more oxygen than many trees, contributing positively to the environment and helping to combat climate change.",
  },
  {
    iconName: "Shield",
    title: "Natural Antimicrobial",
    description:
      "Bamboo has natural antimicrobial properties, which can help reduce bacteria and odors, making it a hygienic choice for bathroom and personal items.",
  },
  {
    iconName: "Droplets",
    title: "Eco-Friendly",
    description:
      "Bamboo requires less water and no pesticides or fertilizers to grow compared to traditional crops, reducing the ecological footprint associated with its cultivation.",
  },
  {
    iconName: "Feather",
    title: "Lightweight",
    description:
      "Bamboo products are typically lightweight, making them easy to handle and transport, which is especially beneficial for personal items and home products.",
  },
  {
    iconName: "Leaf",
    title: "Versatility",
    description:
      "Bamboo can be used to create a wide range of products, including furniture, kitchenware, flooring, and paper. This versatility allows consumers to find bamboo options for many needs.",
  },
  {
    iconName: "Heart",
    title: "Support Local Economies",
    description:
      "Many bamboo products are sourced from local artisans and communities, supporting local economies and promoting fair trade practices.",
  },
];

const SERVICES_EXPECTED: ExpectedRow[] = [
  {
    iconName: "Heart",
    title: "Premium 3-Ply Toilet Tissue",
    description:
      "Crafted from the softest bamboo fibers. Each roll contains 300 sheets of luxurious softness, ensuring a gentle touch for you and your family.",
  },
  {
    iconName: "Recycle",
    title: "100% Biodegradable",
    description:
      "Our products are made from 100% biodegradable materials, helping to reduce waste and promote a greener future.",
  },
  {
    iconName: "Shield",
    title: "Chemical & Hypoallergenic Free",
    description:
      "Our products are free from harmful chemicals, making them safe for sensitive skin and better for your health.",
  },
  {
    iconName: "Leaf",
    title: "Eco-Friendly Packaging",
    description:
      "Sustainable packaging that minimizes environmental impact while keeping your products fresh and protected.",
  },
];

const BAMBOO_FACTS_EXPECTED: ExpectedRow[] = [
  {
    iconName: "TreeDeciduous",
    title: "Saves Trees & Wildlife",
    description:
      "Bamboo grows up to 3 feet per day and regenerates without replanting, protecting forests and wildlife habitats.",
  },
  {
    iconName: "Droplets",
    title: "Uses Less Water",
    description:
      "Bamboo requires significantly less water than traditional tree farming, conserving precious water resources.",
  },
  {
    iconName: "Recycle",
    title: "Naturally Renewable",
    description:
      "As one of the fastest-growing plants on Earth, bamboo is a truly sustainable and renewable resource.",
  },
  {
    iconName: "Shield",
    title: "Naturally Antibacterial",
    description:
      "Bamboo has natural antibacterial properties, making it hygienic and safe for personal care products.",
  },
  {
    iconName: "Leaf",
    title: "Carbon Absorption",
    description:
      "Bamboo absorbs more CO2 and releases more oxygen than equivalent stands of trees, fighting climate change.",
  },
  {
    iconName: "Heart",
    title: "Soft & Strong",
    description:
      "Bamboo fibers create a product that is both incredibly soft and durable, providing superior comfort.",
  },
];

describe("happy-bamboo list-field defaults (moved into TemplateField.defaultRows 2026-09-26)", () => {
  it("parseHappyBambooBenefitsList(undefined) matches the pre-migration copy (happy-bamboo.homepage-benefits-list)", () => {
    expectRowsMatch(parseHappyBambooBenefitsList(undefined), BENEFITS_EXPECTED);
  });

  it("parseHappyBambooBenefitsList([]) falls back to the same defaults", () => {
    expectRowsMatch(parseHappyBambooBenefitsList([]), BENEFITS_EXPECTED);
  });

  it("DEFAULT_HAPPY_BAMBOO_SERVICES_LIST (happy-bamboo.about-services-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_HAPPY_BAMBOO_SERVICES_LIST, SERVICES_EXPECTED);
  });

  it("parseTemplateIconListRows falls back to DEFAULT_HAPPY_BAMBOO_SERVICES_LIST for undefined/empty", () => {
    expectRowsMatch(
      parseTemplateIconListRows(undefined, DEFAULT_HAPPY_BAMBOO_SERVICES_LIST),
      SERVICES_EXPECTED,
    );
    expectRowsMatch(
      parseTemplateIconListRows([], DEFAULT_HAPPY_BAMBOO_SERVICES_LIST),
      SERVICES_EXPECTED,
    );
  });

  it("DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST (happy-bamboo.about-bamboo-list) matches the pre-migration copy", () => {
    expectRowsMatch(DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST, BAMBOO_FACTS_EXPECTED);
  });

  it("parseTemplateIconListRows falls back to DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST for undefined/empty", () => {
    expectRowsMatch(
      parseTemplateIconListRows(undefined, DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST),
      BAMBOO_FACTS_EXPECTED,
    );
    expectRowsMatch(
      parseTemplateIconListRows([], DEFAULT_HAPPY_BAMBOO_BAMBOO_LIST),
      BAMBOO_FACTS_EXPECTED,
    );
  });
});
