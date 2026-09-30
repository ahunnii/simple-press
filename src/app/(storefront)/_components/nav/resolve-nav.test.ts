import { describe, expect, it } from "vitest";

import {
  activeEntryIndex,
  externalLinkProps,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
  type NavItem,
} from "./resolve-nav";

const DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

describe("resolveNav", () => {
  it("falls back to the passed-in defaults only for a missing / non-array value", () => {
    expect(resolveNav(null, DEFAULT_NAV)).toBe(DEFAULT_NAV);
    expect(resolveNav(undefined, DEFAULT_NAV)).toBe(DEFAULT_NAV);
    expect(resolveNav({ label: "Nope" }, DEFAULT_NAV)).toBe(DEFAULT_NAV);
    expect(resolveNav("junk", DEFAULT_NAV)).toBe(DEFAULT_NAV);
  });

  it("treats a saved empty list as 'no links'", () => {
    expect(resolveNav([], DEFAULT_NAV)).toEqual([]);
  });

  it("drops junk and dead entries, defaults href to '', and sanitizes children", () => {
    expect(
      resolveNav(
        [
          null,
          "Home",
          { href: "/no-label" },
          { label: 42, href: "/bad-label" },
          { label: "Shop", href: "/shop", external: "yes" },
          { label: "Blog", href: "https://blog.example", external: true },
          {
            label: "Misc",
            children: [
              { label: "Testimonials", href: "/testimonials" },
              { href: "/orphan" },
              7,
              { label: "Docs", href: "https://docs.example", external: true },
              { label: "No href" },
            ],
          },
          { label: "Empty group", href: "/empty", children: [null, {}] },
          {
            label: "Dead group",
            href: "",
            children: [{ label: "Blank", href: " " }],
          },
          { label: "Dead link" },
        ],
        DEFAULT_NAV,
      ),
    ).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "Blog", href: "https://blog.example", external: true },
      {
        label: "Misc",
        href: "",
        children: [
          { label: "Testimonials", href: "/testimonials" },
          { label: "Docs", href: "https://docs.example", external: true },
        ],
      },
      { label: "Empty group", href: "/empty" },
    ]);
  });
});

describe("isNavItemActive", () => {
  const services: NavItem = {
    label: "Services",
    href: "/services",
    children: [{ label: "Massages", href: "/services/massage" }],
  };
  const misc: NavItem = {
    label: "Misc",
    href: "",
    children: [{ label: "Collections", href: "/collections" }],
  };

  it("is active for its own href or any child's href", () => {
    expect(isNavItemActive("/services", services)).toBe(true);
    expect(isNavItemActive("/collections/summer", misc)).toBe(true);
    expect(isNavItemActive("/shop", misc)).toBe(false);
    // An empty href is never active on its own.
    expect(isNavItemActive("/", { label: "Group", href: "" })).toBe(false);
  });
});

describe("navGroupEntries + activeEntryIndex", () => {
  it("lists a non-empty parent href first and marks only the most specific match", () => {
    const entries = navGroupEntries({
      label: "Services",
      href: "/services",
      children: [{ label: "Massages", href: "/services/massage" }],
    });
    expect(entries.map((e) => e.href)).toEqual([
      "/services",
      "/services/massage",
    ]);
    expect(activeEntryIndex("/services/massage", entries)).toBe(1);
    expect(activeEntryIndex("/services", entries)).toBe(0);
    expect(activeEntryIndex("/shop", entries)).toBe(-1);
  });

  it("omits the parent entry for an empty-href group", () => {
    expect(
      navGroupEntries({
        label: "Misc",
        href: "",
        children: [{ label: "Testimonials", href: "/testimonials" }],
      }).map((e) => e.label),
    ).toEqual(["Testimonials"]);
  });
});

describe("externalLinkProps", () => {
  it("opens external links in a new tab", () => {
    expect(externalLinkProps(true)).toEqual({
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("returns no extra props otherwise", () => {
    expect(externalLinkProps(false)).toEqual({});
    expect(externalLinkProps(undefined)).toEqual({});
  });
});
