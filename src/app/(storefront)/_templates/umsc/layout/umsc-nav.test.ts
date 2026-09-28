import { describe, expect, it } from "vitest";

import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import {
  resolveUmscNav,
  UMSC_DEFAULT_NAV,
  UMSC_QUICK_ACCOUNT_KEYS,
  umscActiveItemIndex,
  umscHrefAllowed,
} from "./umsc-nav";

const allOn = () => true;
const offFor =
  (...off: string[]) =>
  (flag: string) =>
    !off.includes(flag);

const OWNER_NAV = [
  { label: "Shop", href: "/shop" },
  {
    label: "Explore",
    href: "/collections",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Videos", href: "/videos" },
    ],
  },
  {
    label: "More",
    href: "",
    children: [
      { label: "Testimonials", href: "/testimonials" },
      { label: "Anthropic", href: "https://www.anthropic.com", external: true },
    ],
  },
  { label: "About", href: "/about" },
];

describe("resolveUmscNav", () => {
  it("falls back to the shipped default when nothing is saved", () => {
    expect(resolveUmscNav(undefined, allOn)).toEqual(UMSC_DEFAULT_NAV);
    expect(resolveUmscNav(null, allOn)).toEqual(UMSC_DEFAULT_NAV);
  });

  it("keeps a saved empty list empty (no || / .length fallback)", () => {
    expect(resolveUmscNav([], allOn)).toEqual([]);
  });

  it("drops Shop from the default nav when products is off", () => {
    expect(
      resolveUmscNav(undefined, offFor("products")).map((i) => i.label),
    ).toEqual(["About", "FAQ", "Contact"]);
  });

  it("filters owner-saved top-level items and children by flag", () => {
    const nav = resolveUmscNav(
      OWNER_NAV,
      offFor("products", "videos", "testimonials"),
    );
    expect(nav.map((i) => i.label)).toEqual(["Explore", "More", "About"]);
    expect(nav[0]!.children?.map((c) => c.label)).toEqual(["Blog"]);
    // External children pass through untouched.
    expect(nav[1]!.children).toEqual([
      { label: "Anthropic", href: "https://www.anthropic.com", external: true },
    ]);
  });

  it("drops a gated parent and an empty-href group left without children", () => {
    const nav = resolveUmscNav(
      [
        {
          label: "More",
          href: "",
          children: [{ label: "Testimonials", href: "/testimonials" }],
        },
        {
          label: "Explore",
          href: "/collections",
          children: [{ label: "Blog", href: "/blog" }],
        },
      ],
      offFor("testimonials", "collections"),
    );
    expect(nav).toEqual([]);
  });
});

describe("umscActiveItemIndex", () => {
  const nav = resolveUmscNav(OWNER_NAV, allOn);

  it("marks a parent on its own subtree (longest match)", () => {
    expect(umscActiveItemIndex("/collections/summer-collection", nav)).toBe(1);
    expect(umscActiveItemIndex("/shop/lavender-essential", nav)).toBe(0);
  });

  it("marks the group that owns a child route, including empty-href groups", () => {
    expect(umscActiveItemIndex("/blog/first-post", nav)).toBe(1);
    expect(umscActiveItemIndex("/testimonials", nav)).toBe(2);
  });

  it("returns -1 when nothing matches and never matches external links", () => {
    expect(umscActiveItemIndex("/contact", nav)).toBe(-1);
    expect(umscActiveItemIndex("/", nav)).toBe(-1);
  });
});

describe("umscHrefAllowed", () => {
  it("hides a CTA whose route flag is off, keeps ungated hrefs", () => {
    expect(umscHrefAllowed("/contact?type=custom", offFor("products"))).toBe(
      true,
    );
    expect(umscHrefAllowed("/shop", offFor("products"))).toBe(false);
    expect(umscHrefAllowed("/collections/candles", allOn)).toBe(true);
    expect(
      umscHrefAllowed("https://example.com/shop", offFor("products")),
    ).toBe(true);
  });
});

describe("UMSC_QUICK_ACCOUNT_KEYS", () => {
  const quick = (isEnabled: (flag: string) => boolean, includeAdmin = false) =>
    getAccountNavLinks({ isEnabled, includeAdmin })
      .filter((link) => UMSC_QUICK_ACCOUNT_KEYS.has(link.key))
      .map((link) => link.key);

  it("is Orders / Settings / Admin, in shared order", () => {
    expect(quick(allOn, true)).toEqual(["orders", "settings", "admin"]);
    expect(quick(allOn)).toEqual(["orders", "settings"]);
  });

  it("drops Orders when the orders flag is off", () => {
    expect(quick(offFor("orders"), true)).toEqual(["settings", "admin"]);
  });
});
