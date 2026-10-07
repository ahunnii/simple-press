import { describe, expect, it, vi } from "vitest";

import { buildPageMetadata } from "./seo";

// `~/lib/seo` pulls in the tRPC server caller and Sentry for the fetch helpers;
// `buildPageMetadata` itself is pure, so stub the heavy imports.
vi.mock("~/trpc/server", () => ({ api: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const business = {
  name: "Bloom",
  subdomain: "bloom",
  siteContent: null,
};

function titleOf(meta: ReturnType<typeof buildPageMetadata>): string {
  const t = meta.title as { absolute: string };
  return t.absolute;
}

describe("buildPageMetadata pagination", () => {
  it("leaves page 1 and omitted page untouched", () => {
    for (const page of [undefined, 0, 1]) {
      const meta = buildPageMetadata({
        business,
        path: "/shop",
        title: "Shop",
        page,
      });
      expect(titleOf(meta)).toBe("Shop | Bloom");
      expect(meta.alternates?.canonical).toBe(
        "https://bloom.simplepress.test/shop",
      );
    }
  });

  it("makes page 2+ self-canonical and appends the page to every title", () => {
    const meta = buildPageMetadata({
      business,
      path: "/shop",
      title: "Shop",
      page: 2,
    });
    expect(meta.alternates?.canonical).toBe(
      "https://bloom.simplepress.test/shop?page=2",
    );
    expect(titleOf(meta)).toBe("Shop – Page 2 | Bloom");
    expect(meta.openGraph?.title).toBe("Shop – Page 2");
    expect(meta.openGraph?.url).toBe(
      "https://bloom.simplepress.test/shop?page=2",
    );
    expect(meta.twitter?.title).toBe("Shop – Page 2");
  });

  it("still appends the page when the owner overrides the title", () => {
    const meta = buildPageMetadata({
      business: {
        ...business,
        siteContent: { pageMeta: { shop: { title: "Our Soaps" } } },
      },
      path: "/shop",
      pageMetaKey: "shop",
      title: "Shop",
      page: 3,
    });
    expect(titleOf(meta)).toBe("Our Soaps – Page 3 | Bloom");
    expect(meta.twitter?.title).toBe("Our Soaps – Page 3");
  });

  it("uses a custom domain in the paginated canonical", () => {
    const meta = buildPageMetadata({
      business: {
        ...business,
        customDomain: "bloom.example",
        domainStatus: "ACTIVE",
      },
      path: "/blog",
      title: "Blog",
      page: 2,
    });
    expect(meta.alternates?.canonical).toBe(
      "https://bloom.example/blog?page=2",
    );
  });
});
