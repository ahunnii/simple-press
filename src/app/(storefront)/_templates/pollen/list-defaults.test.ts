import { BookOpen, Flower2, HandHelping, Map as MapIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { DEFAULT_POLLEN_GALLERY_ITEMS, DEFAULT_POLLEN_HOMEPAGE_SERVICES } from "./homepage";
import { DEFAULT_POLLEN_SERVICES } from "./services";

/**
 * Regression test for the pollen list-field built-in fallback rows migration
 * (2026-09-26 pattern, bamboo/vii precedent) from hardcoded `GenericIconRow[]`
 * / `GenericImageRow[]` constants (icon *components*, literal image rows) in
 * `homepage/index.tsx` / `services/index.tsx` into field-level `defaultRows`
 * (icon *names*), resolved back to components/rows via `iconRowsFromDefaults`
 * / `imageRowsFromDefaults`. The expected values below are the exact
 * pre-migration constant values — copied verbatim from the field modules
 * before they were rewritten — so this test proves the storefront output is
 * byte-for-byte identical. Run this green against the current (pre-migration)
 * constants first.
 */

type ExpectedIconRow = {
  icon: typeof Flower2;
  title: string;
  description: string;
};

const EXPECTED_SERVICES: ExpectedIconRow[] = [
  {
    icon: Flower2,
    title: "Custom Orders",
    description: "One-of-a-kind pieces made to your specifications.",
  },
  {
    icon: HandHelping,
    title: "Personal Consultations",
    description: "One-on-one guidance to help you find the right fit.",
  },
  {
    icon: MapIcon,
    title: "Local Delivery",
    description: "Fast, friendly delivery right to your door.",
  },
  {
    icon: BookOpen,
    title: "Workshops & Classes",
    description: "Hands-on sessions to learn the craft yourself.",
  },
];

const EXPECTED_GALLERY = [
  {
    label: "Location One",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop",
  },
  {
    label: "Location Two",
    image:
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=450&fit=crop",
  },
  {
    label: "Location Three",
    image:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&h=450&fit=crop",
  },
  {
    label: "Location Four",
    image:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=450&fit=crop",
  },
  {
    label: "Location Five",
    image:
      "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&h=450&fit=crop",
  },
  {
    label: "Location Six",
    image:
      "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&h=450&fit=crop",
  },
];

function expectIconRowsMatch(
  actual: readonly { icon: unknown; title: string; description: string }[],
  expected: ExpectedIconRow[],
) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((row, index) => {
    const exp = expected[index]!;
    expect(row.icon).toBe(exp.icon);
    expect(row.title).toBe(exp.title);
    expect(row.description).toBe(exp.description);
  });
}

describe("pollen list-field defaults (moved into TemplateField.defaultRows 2026-09-26)", () => {
  it("DEFAULT_POLLEN_HOMEPAGE_SERVICES (pollen.homepage.services-list) matches the pre-migration copy", () => {
    expectIconRowsMatch(DEFAULT_POLLEN_HOMEPAGE_SERVICES, EXPECTED_SERVICES);
  });

  it("DEFAULT_POLLEN_SERVICES (pollen.services.services-list) matches the pre-migration copy", () => {
    expectIconRowsMatch(DEFAULT_POLLEN_SERVICES, EXPECTED_SERVICES);
  });

  it("DEFAULT_POLLEN_GALLERY_ITEMS (pollen.homepage.gallery-items) matches the pre-migration copy", () => {
    expect(DEFAULT_POLLEN_GALLERY_ITEMS).toHaveLength(EXPECTED_GALLERY.length);
    DEFAULT_POLLEN_GALLERY_ITEMS.forEach((row, index) => {
      expect(row).toEqual(EXPECTED_GALLERY[index]);
      expect(Object.keys(row).sort()).toEqual(["image", "label"]);
    });
  });
});
