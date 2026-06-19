import Image from "next/image";
import Link from "next/link";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Spotlight } from "~/components/ui/spotlight-new";
import { GalleryRenderer } from "~/components/gallery-renderer";

import { resolveFields } from "..";
import { DarkTrendFeaturedProductsGrid } from "./dark-trend-featured-products-grid";
import { DarkTrendHeroContent } from "./dark-trend-hero-content";
import { DarkTrendMotionSection } from "./dark-trend-motion-section";

export async function DarkTrendHomepage() {
  const homepage = await api.business.getHomepage();

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "dark-trend.homepage.hero-image",
    "dark-trend.homepage.hero-title",
    "dark-trend.homepage.hero-button-text",
    "dark-trend.homepage.hero-button-link",
    "dark-trend.homepage.gallery",
    "dark-trend.first-section-title",
    "dark-trend.first-section-subheader",
    "dark-trend.first-section-description",
    "dark-trend.first-section-image",
    "dark-trend.first-section-button-text",
    "dark-trend.first-section-button-link",
    "dark-trend.second-section-title",
    "dark-trend.second-section-description",
    "dark-trend.cta-header",
    "dark-trend.cta-description",
    "dark-trend.cta-button-text",
    "dark-trend.cta-button-link",
    "dark-trend.cta-image",
  ]);

  const firstProduct = homepage?.products?.[0];

  // Get gallery ID from template field
  const portfolioGalleryId = f["dark-trend.homepage.gallery"];

  // Fetch gallery if set
  const gallery = portfolioGalleryId
    ? await db.gallery.findUnique({
        where: { id: portfolioGalleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;

  return (
    <div className="min-h-screen bg-[#1A1A1A] pb-20 text-white">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        {...sectionGroupAttr("homepage", "hero")}
      >
        <div className="relative h-[85vh] min-h-[560px]">
          <Image
            src={f["dark-trend.homepage.hero-image"] ?? "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
              <DarkTrendHeroContent
                title={f["dark-trend.homepage.hero-title"] ?? ""}
                buttonText={f["dark-trend.homepage.hero-button-text"] ?? ""}
                buttonLink={
                  f["dark-trend.homepage.hero-button-link"] ?? "/shop"
                }
              />
            </div>
          </div>
        </div>
      </section>

      {gallery && <GalleryRenderer gallery={gallery} />}

      {/* Custom Embroidery Section */}
      <section className="bg-zinc-900/80 py-20">
        <DarkTrendMotionSection className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div className="relative">
              <span className="text-sm font-semibold text-purple-400">01.</span>
              <span
                className="absolute top-2 -left-2 overflow-hidden text-6xl leading-none font-bold whitespace-nowrap text-white/5 uppercase md:text-8xl"
                aria-hidden
              >
                {f["dark-trend.first-section-title"]}
              </span>
              <h2 className="relative text-3xl font-bold tracking-tight md:text-6xl">
                {f["dark-trend.first-section-title"]}
              </h2>
            </div>
            <Link
              href={f["dark-trend.first-section-button-link"] ?? "/about"}
              className="rounded border border-white/60 bg-transparent px-5 py-2.5 text-xs font-medium tracking-wider text-white uppercase transition-colors hover:bg-white/10"
            >
              {f["dark-trend.first-section-button-text"]}
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 items-stretch gap-12 lg:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm bg-zinc-800">
              <Image
                src={f["dark-trend.first-section-image"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/30">
                <svg
                  className="h-5 w-5 text-white/80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    d="M3 6l3-2h12l3 2v4c0 7-4 10-9 10s-9-3-9-10V6z"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M3 6l9 6 9-6"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">
                {f["dark-trend.first-section-subheader"]}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                {f["dark-trend.first-section-description"]}
              </p>
            </div>
          </div>
        </DarkTrendMotionSection>
      </section>

      {/* Brand New / Featured Product Section */}
      <section className="relative overflow-hidden bg-[#232323] py-20 antialiased">
        <Spotlight />
        <DarkTrendMotionSection className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <span className="text-sm font-semibold text-purple-400">02.</span>
              {/* <span
                className="absolute -top-4 -left-2 text-5xl leading-none font-bold text-white/10 uppercase md:text-7xl"
                aria-hidden
              >
                {businessName.toUpperCase().replace(/\s/g, " ")}
              </span> */}
              <h2 className="relative max-w-md text-3xl font-bold tracking-tight md:text-7xl">
                {f["dark-trend.second-section-title"]}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                {f["dark-trend.second-section-description"]}
              </p>
            </div>
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
              {firstProduct ? (
                <>
                  <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-sm bg-zinc-800">
                    <Image
                      src={firstProduct.images?.[0]?.url ?? "/placeholder.svg"}
                      alt={firstProduct.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 384px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <h3 className="text-xl font-semibold">
                      {firstProduct.name}
                    </h3>
                    <p className="text-lg text-white/90">
                      {formatPrice(firstProduct.price)} USD
                    </p>
                    {firstProduct.description && (
                      <p className="line-clamp-3 max-w-sm text-sm leading-relaxed text-white/70">
                        {firstProduct.description}
                      </p>
                    )}

                    <Button
                      asChild
                      className="mt-2 inline-flex items-center rounded-md bg-violet-600 px-6 py-2.5 text-center text-sm font-bold text-white transition-opacity hover:bg-violet-700"
                    >
                      <Link
                        href={`/shop/${firstProduct.slug}`}
                        aria-label={`Shop ${firstProduct.name}`}
                      >
                        Shop Now
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex w-full flex-col items-center gap-4 rounded-sm bg-zinc-800/50 py-12 text-center">
                  <p className="text-white/60">No featured product yet.</p>
                  <Link
                    href="/shop"
                    className="inline-flex rounded-md bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    Shop Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </DarkTrendMotionSection>
      </section>

      {/* Products Section */}
      <section className="bg-[#1A1A1A] py-20">
        <DarkTrendMotionSection className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div className="relative">
              <span className="text-sm font-semibold text-purple-400">03.</span>
              <span
                className="absolute top-2 -left-2 overflow-hidden text-6xl leading-none font-bold whitespace-nowrap text-white/5 uppercase md:text-8xl"
                aria-hidden
              >
                Products
              </span>
              <h2 className="relative text-3xl font-bold tracking-tight md:text-6xl">
                Products
              </h2>
            </div>
            <Link
              href="/shop"
              className="rounded border border-white/60 bg-transparent px-5 py-2.5 text-xs font-medium tracking-wider text-white uppercase transition-colors hover:bg-white/10"
            >
              SHOP ALL PRODUCTS
            </Link>
          </div>
          <div className="mt-12">
            <DarkTrendFeaturedProductsGrid />
          </div>
        </DarkTrendMotionSection>
      </section>

      <section className="mx-auto mb-20 max-w-7xl rounded-md bg-[#1F1F1F]">
        <DarkTrendMotionSection className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mt-12 grid grid-cols-1 items-stretch gap-12 lg:grid-cols-3">
            <div className="col-span-2 flex flex-col justify-center space-y-4">
              <div className="relative">
                <span className="text-sm font-semibold text-purple-400">
                  04.
                </span>

                <h2 className="relative text-3xl font-bold tracking-tight md:text-6xl">
                  {f["dark-trend.cta-header"]}
                </h2>
              </div>
              <p className="mt-4 text-lg leading-relaxed text-white/80">
                {f["dark-trend.cta-description"]}
              </p>

              <Button
                className="w-fit rounded border border-white/60 bg-transparent px-5 py-2.5 text-xs font-medium tracking-wider text-white uppercase transition-colors hover:bg-white/10"
                asChild
              >
                <Link href={f["dark-trend.cta-button-link"] ?? "/contact"}>
                  {f["dark-trend.cta-button-text"]}
                </Link>
              </Button>
            </div>
            <div className="relative aspect-4/5 overflow-hidden rounded-sm">
              <Image
                src={f["dark-trend.cta-image"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </DarkTrendMotionSection>
      </section>
    </div>
  );
}
