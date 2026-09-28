import { describe, expect, it } from "vitest";

import {
  resolveFooterNav,
  resolveFooterQuickLinks,
  topLevelNav,
} from "./resolve-footer-nav";
import type { NavItem } from "./resolve-nav";

const DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

describe("topLevelNav", () => {
  it("drops children and preserves external", () => {
    expect(
      topLevelNav([
        {
          label: "Services",
          href: "/services",
          children: [{ label: "Massages", href: "/services/massage" }],
        },
        { label: "Blog", href: "https://blog.example", external: true },
      ]),
    ).toEqual([
      { label: "Services", href: "/services" },
      { label: "Blog", href: "https://blog.example", external: true },
    ]);
  });

  it("drops a group parent with no href of its own", () => {
    expect(
      topLevelNav([
        {
          label: "Misc",
          href: "",
          children: [{ label: "Testimonials", href: "/testimonials" }],
        },
        { label: "Shop", href: "/shop" },
      ]),
    ).toEqual([{ label: "Shop", href: "/shop" }]);
  });

  it("returns fresh objects, never the input items", () => {
    const input: NavItem[] = [{ label: "Shop", href: "/shop" }];
    const out = topLevelNav(input);
    expect(out[0]).not.toBe(input[0]);
    expect(out[0]).not.toHaveProperty("children");
  });
});

describe("resolveFooterNav", () => {
  const FALLBACK = [{ label: "Shop", href: "/shop" }];

  it("falls back for null", () => {
    expect(resolveFooterNav(null, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for undefined", () => {
    expect(resolveFooterNav(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for a non-array value", () => {
    expect(resolveFooterNav("junk", FALLBACK)).toBe(FALLBACK);
    expect(resolveFooterNav({ label: "Nope" }, FALLBACK)).toBe(FALLBACK);
  });

  it("treats a saved empty list as 'no links'", () => {
    expect(resolveFooterNav([], FALLBACK)).toEqual([]);
  });

  it("strips children from an owner-saved item", () => {
    expect(
      resolveFooterNav(
        [
          {
            label: "Services",
            href: "/services",
            children: [{ label: "Massages", href: "/services/massage" }],
          },
        ],
        FALLBACK,
      ),
    ).toEqual([{ label: "Services", href: "/services" }]);
  });

  it("drops a group parent with no href and no surviving link", () => {
    expect(
      resolveFooterNav(
        [
          {
            label: "Misc",
            href: "",
            children: [{ label: "Testimonials", href: "/testimonials" }],
          },
        ],
        FALLBACK,
      ),
    ).toEqual([]);
  });

  it("preserves external on owner-saved items", () => {
    expect(
      resolveFooterNav(
        [{ label: "Blog", href: "https://blog.example", external: true }],
        FALLBACK,
      ),
    ).toEqual([{ label: "Blog", href: "https://blog.example", external: true }]);
  });

  it("drops malformed entries", () => {
    expect(
      resolveFooterNav(
        [null, "junk", { label: 42, href: "/bad" }, { href: "/no-label" }],
        FALLBACK,
      ),
    ).toEqual([]);
  });
});

describe("resolveFooterQuickLinks", () => {
  const only =
    (...off: string[]) =>
    (key: string) =>
      !off.includes(key);

  it("falls back to the main nav's top level, children stripped", () => {
    const navigationItems = [
      { label: "Shop", href: "/shop" },
      {
        label: "Services",
        href: "/services",
        children: [{ label: "Massages", href: "/services/massage" }],
      },
    ];
    expect(
      resolveFooterQuickLinks({
        footerItems: null,
        navigationItems,
        navDefaults: DEFAULT_NAV,
        isEnabled: () => true,
      }),
    ).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "Services", href: "/services" },
    ]);
  });

  it("falls back to the template defaults when navigationItems is also unset", () => {
    expect(
      resolveFooterQuickLinks({
        footerItems: null,
        navigationItems: null,
        navDefaults: DEFAULT_NAV,
        isEnabled: () => true,
      }),
    ).toEqual([
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ]);
  });

  it("uses the owner's footer list over the main-nav fallback", () => {
    expect(
      resolveFooterQuickLinks({
        footerItems: [{ label: "Custom", href: "/custom" }],
        navigationItems: [{ label: "Shop", href: "/shop" }],
        navDefaults: DEFAULT_NAV,
        isEnabled: () => true,
      }),
    ).toEqual([{ label: "Custom", href: "/custom" }]);
  });

  it("removes a flag-gated /blog link when blog is off", () => {
    expect(
      resolveFooterQuickLinks({
        footerItems: [
          { label: "Shop", href: "/shop" },
          { label: "Blog", href: "/blog" },
        ],
        navigationItems: null,
        navDefaults: DEFAULT_NAV,
        isEnabled: only("blog"),
      }),
    ).toEqual([{ label: "Shop", href: "/shop" }]);
  });

  it("never flag-filters an external link", () => {
    expect(
      resolveFooterQuickLinks({
        footerItems: [
          { label: "Ext", href: "https://example.com/shop", external: true },
        ],
        navigationItems: null,
        navDefaults: DEFAULT_NAV,
        isEnabled: only("products"),
      }),
    ).toEqual([
      { label: "Ext", href: "https://example.com/shop", external: true },
    ]);
  });
});
