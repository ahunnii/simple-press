import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "~/types";

import { OliveShopClient } from "./olive/shop/olive-shop-client";
import { PinkBlogListing } from "./pink/blog/pink-blog-listing";
import { UmscShopClient } from "./umsc/shop/umsc-shop-client";
import { ViiShopClient } from "./vii/shop/vii-shop-client";
import { WealthBlogClient } from "./wealth/blog/wealth-blog-client";

/**
 * Crawlable pagination: every ENABLED page control is a real `<a href="…?page=N">`
 * (a plain click is intercepted client-side), a DISABLED Prev/Next stays a
 * `<button disabled>`, and "load more" templates derive their visible count
 * from `?page=N` and link to `?page=N+1`.
 */

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/shop",
  useSearchParams: () => new URLSearchParams(search),
}));

// Heavy presentation children are irrelevant here — the grids just report how
// many items they were handed.
vi.mock("./umsc/shared/umsc-product-grid", () => ({
  UmscProductGrid: ({ products }: { products: unknown[] }) => (
    <div data-testid="grid" data-count={products.length} />
  ),
}));
vi.mock("./vii/shared/vii-product-grid", () => ({
  ViiProductGrid: ({ products }: { products: unknown[] }) => (
    <div data-testid="grid" data-count={products.length} />
  ),
}));
vi.mock("./olive/shared", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    OliveProductGrid: ({ products }: { products: unknown[] }) => (
      <div data-testid="grid" data-count={products.length} />
    ),
  };
});
vi.mock("./vii/homepage/vii-brands-section", () => ({
  ViiBrandsSection: () => null,
}));
vi.mock("./vii/shop/vii-shop-promo-band", () => ({
  ViiShopPromoBand: () => null,
}));
vi.mock("./vii/hooks/use-vii-reveal", () => ({
  useViiReveal: () => ({ ref: { current: null }, visible: true }),
}));
vi.mock("./wealth/hooks/use-wealth-reveal", () => ({
  useWealthReveal: () => ({ ref: { current: null }, visible: true }),
}));
vi.mock("./wealth/blog/wealth-blog-card", () => ({
  WealthBlogCard: () => <div data-testid="card" />,
}));
vi.mock("./pink/shared/pink-reveal", () => ({
  PinkReveal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const products = Array.from({ length: 60 }, (_, i) => ({
  id: `p${i}`,
  name: `Product ${i}`,
  slug: `p-${i}`,
  description: null,
  price: (i + 1) * 100,
  trackInventory: false,
  images: [],
  variants: [],
  collectionProducts: [],
})) as unknown as Product[];

const posts = Array.from({ length: 30 }, (_, i) => ({
  id: `b${i}`,
  slug: `post-${i}`,
  title: `Post ${i}`,
  content: "Body",
  excerpt: "Excerpt",
  metaDescription: null,
  createdAt: new Date(2026, 0, 30 - i),
  updatedAt: new Date(2026, 0, 30 - i),
  featuredImage: null,
})) as never[];

function pageNavLinks() {
  const nav = screen.getByRole("navigation", { name: "Pagination" });
  return Array.from(nav.querySelectorAll("a"));
}

beforeEach(() => {
  search = "";
  window.scrollTo = vi.fn() as never;
});

describe("numbered pagers render links", () => {
  const cases = [
    [
      "umsc",
      () => (
        <UmscShopClient
          products={products}
          emptyHeading="e"
          emptyBody="e"
          emptyLinkLabel="e"
        />
      ),
    ],
    [
      "vii",
      () => (
        <ViiShopClient
          products={products}
          collections={[]}
          collectionsOverline=""
          collectionsHeading=""
          promo={{
            left: { heading: "" } as never,
            right: { heading: "" } as never,
          }}
          showBrands={false}
          brands={{ overline: "", heading: "", logos: [] }}
        />
      ),
    ],
    [
      "olive",
      () => (
        <OliveShopClient
          products={products}
          heading="Shop"
          body="b"
          emptyHeading="e"
          emptyBody="e"
          noResultsHeading="n"
          noResultsBody="n"
        />
      ),
    ],
  ] as const;

  for (const [name, ui] of cases) {
    it(`${name}: page 1 — page numbers + Next are links, Previous is a disabled button`, () => {
      render(ui());
      const links = pageNavLinks();
      expect(links.length).toBeGreaterThan(2);
      // Page 1 canonically has no `page` param; every other target does.
      for (const a of links) {
        const href = a.getAttribute("href") ?? "";
        expect(href.startsWith("/shop")).toBe(true);
        if (!["1", "Previous"].includes(a.textContent ?? ""))
          expect(href).toContain("page=");
      }
      const nav = screen.getByRole("navigation", { name: "Pagination" });
      const prev = Array.from(nav.querySelectorAll("button")).find(
        (b) => b.textContent === "Previous",
      );
      expect(prev).toBeDefined();
      expect(prev).toBeDisabled();
      const next = links.find((a) => a.textContent === "Next");
      expect(next?.getAttribute("href")).toContain("page=2");
      expect(
        links.find((a) => a.getAttribute("aria-current") === "page")
          ?.textContent,
      ).toBe("1");
    });

    it(`${name}: page 2 — Previous links back to page 1 (no page param)`, () => {
      search = "page=2";
      render(ui());
      const prev = pageNavLinks().find((a) => a.textContent === "Previous");
      expect(prev).toBeDefined();
      expect(prev!.getAttribute("href")).toBe("/shop");
    });
  }
});

describe("load-more pagers derive from the URL", () => {
  it("pink blog: ?page=2 shows 2 × 9 posts and links to ?page=3", () => {
    search = "page=2";
    render(
      <PinkBlogListing
        pages={posts}
        journalLabel="Journal"
        showFeatured={false}
        featuredBadge=""
        emptyHeading=""
        emptyBody=""
        emptyCtaLabel=""
        emptyCtaLink=""
        searchEmptyMessage=""
      />,
    );
    const more = screen.getByRole("link", { name: "Older posts" });
    expect(more.getAttribute("href")).toBe("/shop?page=3");
    expect(screen.getAllByRole("link", { name: /^Post \d+$/ })).toHaveLength(
      18,
    );
  });

  it("wealth blog: ?page=2 shows 2 × 9 posts and links to ?page=3", () => {
    search = "page=2";
    render(<WealthBlogClient pages={posts} />);
    expect(screen.getAllByTestId("card")).toHaveLength(18);
    const more = screen.getByRole("link", { name: "Load More" });
    expect(more.getAttribute("href")).toBe("/shop?page=3");
  });

  it("wealth blog: the link disappears once everything is shown", () => {
    search = "page=4";
    render(<WealthBlogClient pages={posts} />);
    expect(screen.getAllByTestId("card")).toHaveLength(30);
    expect(screen.queryByRole("link", { name: "Load More" })).toBeNull();
  });
});
