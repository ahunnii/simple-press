import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { POLICY_TEMPLATES } from "~/lib/legal/merchant-policy-templates";

import {
  getReservedPageSlugMessage,
  isReservedPageSlug,
  RESERVED_PAGE_SLUGS,
  RESERVED_POLICY_SLUGS,
} from "./reserved-page-slugs";

const APP_DIR = path.join(process.cwd(), "src", "app");

/**
 * First URL segments that the route folders under `dir` can serve. Route
 * groups `(x)` are transparent (their children are expanded in place);
 * `_private` folders and dynamic `[x]` segments never claim a literal
 * segment, and files are ignored (dotted file routes can't match a slug).
 */
function literalSegments(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith("_") || name.startsWith("[") || name.startsWith("@"))
      continue;
    if (/^\(.+\)$/.test(name)) {
      out.push(...literalSegments(path.join(dir, name)));
      continue;
    }
    // Folders like `indexnow-key.txt/` serve a dotted URL no slug can equal.
    if (name.includes(".")) continue;
    out.push(name);
  }
  return out;
}

describe("RESERVED_PAGE_SLUGS", () => {
  it("covers every route folder under src/app (incl. the storefront group)", () => {
    const segments = literalSegments(APP_DIR);
    // Sanity: the walk found real routes, so a path change can't make this vacuous.
    expect(segments).toEqual(
      expect.arrayContaining(["about", "admin", "shop"]),
    );
    expect(segments).toContain("sign-in"); // expanded from (auth-redirects)

    const missing = segments.filter((s) => !RESERVED_PAGE_SLUGS.has(s));
    expect(
      missing,
      `Add these new route folders to ROUTE_SLUG_LABELS in src/lib/reserved-page-slugs.ts: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("only contains slugs a page could actually have", () => {
    for (const slug of RESERVED_PAGE_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("reserves the middleware / next.config paths", () => {
    expect(RESERVED_PAGE_SLUGS.has("monitoring-tunnel")).toBe(true);
    expect(RESERVED_PAGE_SLUGS.has("favicon")).toBe(true);
  });
});

describe("RESERVED_POLICY_SLUGS", () => {
  it("matches the slugs POLICY_TEMPLATES creates", () => {
    expect(Object.keys(RESERVED_POLICY_SLUGS).sort()).toEqual(
      Object.values(POLICY_TEMPLATES)
        .map((t) => t.slug)
        .sort(),
    );
  });
});

describe("getReservedPageSlugMessage", () => {
  it("rejects built-in route slugs for page and custom types", () => {
    expect(getReservedPageSlugMessage("about", "page")).toBe(
      `"/about" is already used by your site's built-in About page — choose a different URL.`,
    );
    expect(isReservedPageSlug("shop", "custom")).toBe(true);
    expect(isReservedPageSlug("order")).toBe(true);
    expect(getReservedPageSlugMessage("api", "page")).toContain(
      "built-in page",
    );
  });

  it("allows ordinary slugs", () => {
    expect(isReservedPageSlug("our-story")).toBe(false);
    expect(isReservedPageSlug("about-us")).toBe(false);
  });

  it("reserves policy slugs for every non-policy type, including blog", () => {
    expect(getReservedPageSlugMessage("refund-policy", "page")).toBe(
      `"/refund-policy" is reserved for your Refund Policy (Site Setup → Policies) — choose a different URL.`,
    );
    expect(isReservedPageSlug("privacy-policy", "custom")).toBe(true);
    expect(isReservedPageSlug("terms-of-service", "blog")).toBe(true);
  });

  it("does not apply route-folder slugs to blog posts (they live at /blog/<slug>)", () => {
    expect(isReservedPageSlug("about", "blog")).toBe(false);
    expect(isReservedPageSlug("shop", "blog")).toBe(false);
  });

  it("exempts policy pages from both lists", () => {
    expect(isReservedPageSlug("refund-policy", "policy")).toBe(false);
    expect(isReservedPageSlug("about", "policy")).toBe(false);
  });
});
