import { describe, expect, it } from "vitest";

import { siteContentSchema } from "./content";

/**
 * Regression guard for a template-ownership bypass.
 *
 * `content.updateSiteContent` used to accept `templateId` and write it straight
 * to `Business.templateId` with no ownership check, while commercial templates
 * are gated per-subdomain by `isTemplateAvailableForSubdomain` and only
 * `business.updateTemplate` enforces that. Any OWNER/MANAGER could therefore
 * hand themselves a paid template by posting it through a content save.
 *
 * The fix is that this schema no longer declares `templateId` at all, so Zod
 * strips it and the router never sees it. If someone re-adds the key, these
 * tests fail.
 */
describe("siteContentSchema — templateId is not accepted", () => {
  it("strips templateId from a content save", () => {
    const parsed = siteContentSchema.parse({
      templateId: "pink",
      footerText: "Hello",
    });

    expect(parsed).not.toHaveProperty("templateId");
    expect(parsed).toEqual({ footerText: "Hello" });
  });

  it("strips templateId even when it is the only key", () => {
    expect(siteContentSchema.parse({ templateId: "pink" })).toEqual({});
  });

  it("still accepts the content fields the Brand Identity form sends", () => {
    const parsed = siteContentSchema.parse({
      footerText: "We are here for you.",
      socialLinks: { instagram: "https://instagram.com/store" },
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.png",
      primaryColor: "#2563eb",
    });

    expect(parsed).toEqual({
      footerText: "We are here for you.",
      socialLinks: { instagram: "https://instagram.com/store" },
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.png",
      primaryColor: "#2563eb",
    });
  });
});

/**
 * Link fields used to be guarded by `z.string().url()` (social links) or by
 * nothing at all (`navigationItems.href`, `heroButtonLink`). `.url()` is not a
 * scheme guard — Zod 3.25 accepts `javascript:` and `data:` — so the only
 * thing stopping stored XSS on ~40 storefront render sites was React 19's
 * `javascript:` rewrite of JSX `href` props. See `~/lib/safe-href`.
 */
describe("siteContentSchema — link fields are scheme-guarded", () => {
  it.each(["javascript:alert(1)", "data:text/html;base64,AAA", "ftp://x"])(
    "refuses %s as a social link",
    (bad) => {
      expect(
        siteContentSchema.safeParse({ socialLinks: { instagram: bad } })
          .success,
      ).toBe(false);
    },
  );

  it("still refuses a relative social link (a profile is always absolute)", () => {
    expect(
      siteContentSchema.safeParse({ socialLinks: { instagram: "/instagram" } })
        .success,
    ).toBe(false);
  });

  it("still accepts an empty social link so owners can clear one", () => {
    expect(siteContentSchema.parse({ socialLinks: { instagram: "" } })).toEqual(
      { socialLinks: { instagram: "" } },
    );
  });

  it.each(["javascript:alert(1)", "java\tscript:alert(1)", "vbscript:x"])(
    "refuses %s as a navigation href",
    (bad) => {
      expect(
        siteContentSchema.safeParse({
          navigationItems: [{ label: "Shop", href: bad }],
        }).success,
      ).toBe(false);
    },
  );

  it("accepts the relative hrefs navigation actually uses", () => {
    const parsed = siteContentSchema.parse({
      navigationItems: [
        { label: "Shop", href: "/shop" },
        { label: "Contact", href: "#contact", children: [] },
        { label: "Blog", href: "https://example.com/blog", external: true },
      ],
      heroButtonLink: "/collections/new",
    });

    expect(parsed.navigationItems?.[0]?.href).toBe("/shop");
    expect(parsed.heroButtonLink).toBe("/collections/new");
  });

  it("refuses an unsafe heroButtonLink", () => {
    expect(
      siteContentSchema.safeParse({ heroButtonLink: "javascript:1" }).success,
    ).toBe(false);
  });
});

/**
 * `footerNavigationItems` — owner's flat footer "Quick Links" list. Mirrors
 * `navigationItems` semantics: `null`/missing falls back at read time
 * (`resolveFooterNav`), a saved `[]` means "no links".
 */
describe("siteContentSchema — footerNavigationItems", () => {
  it("accepts a valid flat list", () => {
    const parsed = siteContentSchema.parse({
      footerNavigationItems: [
        { label: "Shop", href: "/shop" },
        { label: "Blog", href: "https://example.com/blog", external: true },
      ],
    });

    expect(parsed.footerNavigationItems).toEqual([
      { label: "Shop", href: "/shop" },
      { label: "Blog", href: "https://example.com/blog", external: true },
    ]);
  });

  it("accepts null (falls back to the main nav)", () => {
    expect(
      siteContentSchema.parse({ footerNavigationItems: null })
        .footerNavigationItems,
    ).toBeNull();
  });

  it("accepts an empty list (means no links)", () => {
    expect(
      siteContentSchema.parse({ footerNavigationItems: [] })
        .footerNavigationItems,
    ).toEqual([]);
  });

  it("rejects a 13th item (cap is 12)", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({
      label: `Link ${i}`,
      href: "/x",
    }));
    expect(
      siteContentSchema.safeParse({ footerNavigationItems: items }).success,
    ).toBe(false);
  });

  it("accepts exactly 12 items", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      label: `Link ${i}`,
      href: "/x",
    }));
    expect(
      siteContentSchema.safeParse({ footerNavigationItems: items }).success,
    ).toBe(true);
  });

  it("refuses a javascript: href", () => {
    expect(
      siteContentSchema.safeParse({
        footerNavigationItems: [{ label: "Bad", href: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });

  it("strips a children key on a footer item (navChildSchema has no children field)", () => {
    // Zod object schemas strip unknown keys by default (no `.passthrough()`
    // anywhere in this chain), so a `children` array on a footer entry is
    // dropped rather than rejected or preserved.
    const parsed = siteContentSchema.parse({
      footerNavigationItems: [
        {
          label: "Shop",
          href: "/shop",
          children: [{ label: "Nested", href: "/shop/nested" }],
        },
      ],
    });

    expect(parsed.footerNavigationItems?.[0]).toEqual({
      label: "Shop",
      href: "/shop",
    });
    expect(parsed.footerNavigationItems?.[0]).not.toHaveProperty("children");
  });
});
