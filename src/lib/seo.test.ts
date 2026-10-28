import { describe, expect, it, vi } from "vitest";

import { STORAGE_BASE } from "~/lib/s3/url";

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

describe("buildPageMetadata og:image chain", () => {
  const logoUrl = `${STORAGE_BASE}biz/logo.avif?v=1`;
  const withContent = (siteContent: Record<string, unknown>) => ({
    ...business,
    siteContent,
  });
  const firstImage = (meta: ReturnType<typeof buildPageMetadata>) =>
    (
      meta.openGraph?.images as { url: string; width: number; height: number }[]
    )[0]!;

  it("falls back to the generated card on the canonical origin, not the raw logo", () => {
    const meta = buildPageMetadata({
      business: withContent({ logoUrl }),
      path: "/shop",
      title: "Shop",
    });
    const image = firstImage(meta);
    expect(image.url).toMatch(
      /^https:\/\/bloom\.simplepress\.test\/og-fallback\.png\?v=[0-9a-f]{8}$/,
    );
    expect(image).toMatchObject({ width: 1200, height: 630 });
    expect(meta.twitter?.images).toEqual([image.url]);
  });

  it("uses the custom domain for the card URL", () => {
    const meta = buildPageMetadata({
      business: {
        ...withContent({ logoUrl }),
        customDomain: "bloom.example",
        domainStatus: "ACTIVE",
      },
      path: "/",
      title: "Home",
    });
    expect(firstImage(meta).url).toContain(
      "https://bloom.example/og-fallback.png",
    );
  });

  it("builds a card for SVG logos too", () => {
    const meta = buildPageMetadata({
      business: withContent({ logoUrl: `${STORAGE_BASE}biz/logo.svg` }),
      path: "/",
      title: "Home",
    });
    expect(firstImage(meta).url).toContain("/og-fallback.png");
  });

  it("emits no image for a store without a logo", () => {
    const meta = buildPageMetadata({
      business: withContent({ logoUrl: null }),
      path: "/",
      title: "Home",
    });
    expect(meta.openGraph?.images).toBeUndefined();
    expect(meta.twitter?.images).toBeUndefined();
  });

  it("keeps the order: page -> record -> fallback -> site og -> logo card", () => {
    const pageMeta = { shop: { ogImage: "https://x.test/page.jpg" } };
    const base = {
      path: "/shop",
      pageMetaKey: "shop" as const,
      title: "Shop",
      entity: { ogImage: "https://x.test/record.jpg" },
      ogImage: "https://x.test/photo.jpg",
    };
    const biz = withContent({
      pageMeta,
      ogImage: "https://x.test/site.jpg",
      logoUrl,
    });
    expect(firstImage(buildPageMetadata({ ...base, business: biz })).url).toBe(
      "https://x.test/page.jpg",
    );
    expect(
      firstImage(
        buildPageMetadata({
          ...base,
          business: withContent({
            ogImage: "https://x.test/site.jpg",
            logoUrl,
          }),
        }),
      ).url,
    ).toBe("https://x.test/record.jpg");
    expect(
      firstImage(
        buildPageMetadata({
          ...base,
          entity: undefined,
          business: withContent({
            ogImage: "https://x.test/site.jpg",
            logoUrl,
          }),
        }),
      ).url,
    ).toBe("https://x.test/photo.jpg");
    expect(
      firstImage(
        buildPageMetadata({
          ...base,
          entity: undefined,
          ogImage: undefined,
          business: withContent({
            ogImage: "https://x.test/site.jpg",
            logoUrl,
          }),
        }),
      ).url,
    ).toBe("https://x.test/site.jpg");
  });

  it("skips AVIF at every step and falls through", () => {
    const meta = buildPageMetadata({
      business: withContent({
        ogImage: "https://x.test/site.avif",
        logoUrl,
      }),
      path: "/shop/p",
      title: "P",
      entity: { ogImage: "https://x.test/record.AVIF?v=1" },
      ogImage: "https://x.test/photo.avif",
    });
    expect(firstImage(meta).url).toContain("/og-fallback.png");
  });

  it("falls to a non-AVIF later step when an earlier one is AVIF", () => {
    const meta = buildPageMetadata({
      business: withContent({ logoUrl }),
      path: "/shop/p",
      title: "P",
      ogImage: "https://x.test/photo.avif",
      entity: { ogImage: "https://x.test/record.png" },
    });
    expect(firstImage(meta).url).toBe("https://x.test/record.png");
  });
});
