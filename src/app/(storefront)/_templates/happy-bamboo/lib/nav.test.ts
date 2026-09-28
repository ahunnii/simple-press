import { describe, expect, it } from "vitest";

import type { NavItem } from "~/app/(storefront)/_components/nav";

import { HB_DEFAULT_NAV, resolveHappyBambooNav } from "./nav";

// Sanitizing, active-state, and group-entry behavior is covered by the shared
// `_components/nav/resolve-nav.test.ts`; the flag-drop mechanics themselves
// are covered by `_components/nav/nav-flags.test.ts`. This only pins the
// default binding and that happy-bamboo actually composes the two
// (P-NAV-FLAGS, PF1).
const allEnabled = () => true;
const noneEnabled = () => false;

describe("resolveHappyBambooNav", () => {
  it("falls back to HB_DEFAULT_NAV only for a missing / non-array value", () => {
    expect(resolveHappyBambooNav(null, allEnabled)).toEqual(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav(undefined, allEnabled)).toEqual(
      HB_DEFAULT_NAV,
    );
    expect(resolveHappyBambooNav("junk", allEnabled)).toEqual(HB_DEFAULT_NAV);
  });

  it("treats a saved empty list as 'no links'", () => {
    expect(resolveHappyBambooNav([], allEnabled)).toEqual([]);
  });

  it("drops shipped-default entries gated by a disabled feature flag (P-NAV-FLAGS)", () => {
    // /shop is the only HB_DEFAULT_NAV entry behind a flag ("products").
    expect(resolveHappyBambooNav(null, noneEnabled)).toEqual([
      { href: "/", label: "Home" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
    ]);
  });

  it("drops owner-saved nav entries the same way", () => {
    const items: NavItem[] = [
      { href: "/", label: "Home" },
      { href: "/shop", label: "Shop" },
      {
        href: "",
        label: "Extras",
        children: [{ href: "/testimonials", label: "Testimonials" }],
      },
    ];
    expect(
      resolveHappyBambooNav(
        items,
        (flag) => flag !== "products" && flag !== "testimonials",
      ),
    ).toEqual([{ href: "/", label: "Home" }]);
  });
});
