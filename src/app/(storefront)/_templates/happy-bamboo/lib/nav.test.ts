import { describe, expect, it } from "vitest";

import {
  HB_DEFAULT_NAV,
  hbActiveEntryIndex,
  hbGroupEntries,
  isHbItemActive,
  resolveHappyBambooNav,
} from "./nav";

describe("resolveHappyBambooNav", () => {
  it("falls back to the shipped default only for a missing / non-array value", () => {
    expect(resolveHappyBambooNav(null)).toBe(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav(undefined)).toBe(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav({ label: "Nope" })).toBe(HB_DEFAULT_NAV);
    expect(resolveHappyBambooNav("junk")).toBe(HB_DEFAULT_NAV);
  });

  it("treats a saved empty list as 'no links'", () => {
    expect(resolveHappyBambooNav([])).toEqual([]);
  });

  it("drops junk and dead entries, defaults href to '', and sanitizes children", () => {
    expect(
      resolveHappyBambooNav([
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
      ]),
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

describe("isHbItemActive", () => {
  const services = {
    label: "Services",
    href: "/services",
    children: [{ label: "Massages", href: "/services/massage" }],
  };
  const misc = {
    label: "Misc",
    href: "",
    children: [{ label: "Collections", href: "/collections" }],
  };

  it("is active for its own href or any child's href", () => {
    expect(isHbItemActive("/services", services)).toBe(true);
    expect(isHbItemActive("/collections/summer", misc)).toBe(true);
    expect(isHbItemActive("/shop", misc)).toBe(false);
    // An empty href is never active on its own.
    expect(isHbItemActive("/", { label: "Group", href: "" })).toBe(false);
  });
});

describe("hbGroupEntries + hbActiveEntryIndex", () => {
  it("lists a non-empty parent href first and marks only the most specific match", () => {
    const entries = hbGroupEntries({
      label: "Services",
      href: "/services",
      children: [{ label: "Massages", href: "/services/massage" }],
    });
    expect(entries.map((e) => e.href)).toEqual([
      "/services",
      "/services/massage",
    ]);
    expect(hbActiveEntryIndex("/services/massage", entries)).toBe(1);
    expect(hbActiveEntryIndex("/services", entries)).toBe(0);
    expect(hbActiveEntryIndex("/shop", entries)).toBe(-1);
  });

  it("omits the parent entry for an empty-href group", () => {
    expect(
      hbGroupEntries({
        label: "Misc",
        href: "",
        children: [{ label: "Testimonials", href: "/testimonials" }],
      }).map((e) => e.label),
    ).toEqual(["Testimonials"]);
  });
});
