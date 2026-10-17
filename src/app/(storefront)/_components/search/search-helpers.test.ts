import { describe, expect, it } from "vitest";

import { highlightParts, highlightTerms } from "./highlight";
import { resolveSearchPopular } from "./popular";

const allOn = () => true;

describe("highlightParts", () => {
  it("marks every query word, case-insensitively", () => {
    expect(highlightParts("Linen Summer Dress", "dress linen")).toEqual([
      { text: "Linen", match: true },
      { text: " Summer ", match: false },
      { text: "Dress", match: true },
    ]);
  });

  it("matches the plural-trimmed stem", () => {
    expect(highlightTerms("dresses")).toEqual(["dresses", "dress"]);
    expect(highlightParts("Wrap dress", "dresses")).toEqual([
      { text: "Wrap ", match: false },
      { text: "dress", match: true },
    ]);
  });

  it("treats regex metacharacters literally", () => {
    expect(highlightParts("Price (USD) $5.00", "(usd) $5.")).toEqual([
      { text: "Price ", match: false },
      { text: "(USD)", match: true },
      { text: " ", match: false },
      { text: "$5.", match: true },
      { text: "00", match: false },
    ]);
  });

  it("returns the text unmarked for an empty query", () => {
    expect(highlightParts("Hello", "  ")).toEqual([
      { text: "Hello", match: false },
    ]);
  });
});

describe("resolveSearchPopular", () => {
  it("uses the owner's nav, dropping Home, external and flag-off links", () => {
    const nav = [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Events", href: "/events" },
      { label: "Insta", href: "https://instagram.com/x", external: true },
      { label: "More", href: "", children: [{ label: "FAQ", href: "/faq" }] },
    ];
    const popular = resolveSearchPopular(nav, (k) => k !== "events");
    expect(popular).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "FAQ", href: "/faq" },
    ]);
  });

  it("falls back to flag-filtered starter links without a usable nav", () => {
    const popular = resolveSearchPopular(
      [{ label: "Home", href: "/" }],
      (k) => k === "blog",
    );
    expect(popular.map((l) => l.label)).toEqual(["Blog", "FAQ", "Contact"]);
    expect(resolveSearchPopular(undefined, allOn)).toHaveLength(6);
  });
});
