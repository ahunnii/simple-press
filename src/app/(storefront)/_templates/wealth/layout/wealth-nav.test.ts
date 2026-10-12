import { describe, expect, it, vi } from "vitest";

import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  filterNavByFlags,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

import { isImpactHref, pagesIncludeImpact } from "../lib/has-impact-page";
import { WEALTH_NAV_DEFAULTS, wealthNavDefaults } from "./wealth-nav";

// has-impact-page imports the server tRPC caller; the pure helpers under test
// never touch it.
vi.mock("~/trpc/server", () => ({ api: {} }));

const find = (nav: ReturnType<typeof wealthNavDefaults>, label: string) =>
  nav.find((i) => i.label === label);

describe("wealthNavDefaults — impact page", () => {
  it("keeps the Impact group when an /impact page exists", () => {
    const impact = find(wealthNavDefaults("/resources", true), "Impact");
    expect(impact?.href).toBe("");
    expect(impact?.children?.map((c) => c.href)).toEqual([
      "/impact",
      "/testimonials",
    ]);
  });

  it("is the full menu by default (shipped constant)", () => {
    expect(find(WEALTH_NAV_DEFAULTS, "Impact")?.children).toHaveLength(2);
  });

  it("drops Impact Report and collapses to a top-level Meet the Co-ops without the page", () => {
    const nav = wealthNavDefaults("/resources", false);
    expect(find(nav, "Impact")).toBeUndefined();
    expect(find(nav, "Meet the Co-ops")).toEqual({
      label: "Meet the Co-ops",
      href: "/testimonials",
    });
    expect(JSON.stringify(nav)).not.toContain("/impact");
    // Same position (between Programs and News & Resources), other items intact.
    expect(nav.map((i) => i.label)).toEqual([
      "About Us",
      "Programs",
      "Meet the Co-ops",
      "News & Resources",
      "Contact & Office Hours",
    ]);
  });

  it("the collapsed link is still flag-filtered (testimonials off)", () => {
    const nav = filterNavByFlags(
      resolveNav(undefined, wealthNavDefaults("/resources", false)),
      resolveFlags({ testimonials: false }).isEnabled,
    );
    expect(nav.some((i) => i.href === "/testimonials")).toBe(false);
  });

  it("an owner-saved menu is never filtered by the impact page", () => {
    const saved = [
      { label: "Report", href: "/impact" },
      { label: "Home", href: "/" },
    ];
    expect(resolveNav(saved, wealthNavDefaults("/resources", false))).toEqual(
      expect.arrayContaining(saved),
    );
  });
});

describe("impact page helpers", () => {
  it("pagesIncludeImpact matches only the impact slug", () => {
    expect(pagesIncludeImpact([{ slug: "about" }, { slug: "impact" }])).toBe(
      true,
    );
    expect(pagesIncludeImpact([{ slug: "about" }])).toBe(false);
    expect(pagesIncludeImpact([])).toBe(false);
    expect(pagesIncludeImpact(undefined)).toBe(false);
  });

  it("isImpactHref recognises /impact variants only", () => {
    expect(isImpactHref("/impact")).toBe(true);
    expect(isImpactHref("/impact/")).toBe(true);
    expect(isImpactHref("/impact?x=1")).toBe(true);
    expect(isImpactHref("/impact#top")).toBe(true);
    expect(isImpactHref("/impact-2024")).toBe(false);
    expect(isImpactHref("/reports")).toBe(false);
    expect(isImpactHref("https://example.com/impact")).toBe(false);
    expect(isImpactHref("")).toBe(false);
  });
});
