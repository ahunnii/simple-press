import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { api } from "~/trpc/server";

import { FeaturedProductsGrid } from "./modern-featured-products-grid";

export async function ModernHomePage() {
  const homepage = await api.business.getHomepage();

  const themeSpecificFields = homepage?.siteContent?.customFields as Record<
    string,
    string
  >;
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative h-[85vh] min-h-[600px]">
          <Image
            src={
              themeSpecificFields?.["modern.homepage.hero-image"] ??
              "/placeholder.svg"
            }
            alt={homepage?.name ?? "Hero Image"}
            fill
            className="object-cover"
            priority
          />
          <div className="bg-foreground/30 absolute inset-0" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
              <div className="max-w-xl">
                <h1 className="text-background font-serif text-5xl leading-tight text-balance md:text-7xl md:leading-tight">
                  {themeSpecificFields?.["modern.homepage.hero-title"] ??
                    "Designed for modern living"}
                </h1>
                <p className="text-background/80 mt-6 text-lg leading-relaxed">
                  {themeSpecificFields?.["modern.homepage.hero-subtitle"] ??
                    "Thoughtfully crafted home goods that blend beauty with everyday function."}
                </p>
                <Link
                  href={
                    themeSpecificFields?.[
                      "modern.homepage.hero-cta-button-link"
                    ] ?? "/shop"
                  }
                  className="bg-background text-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
                >
                  {themeSpecificFields?.[
                    "modern.homepage.hero-cta-button-text"
                  ] ?? "Shop Collection"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Strip */}
      <section className="border-border bg-background border-b">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                {themeSpecificFields?.["modern.homepage.features-title-1"] ??
                  "Crafted With Care"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {themeSpecificFields?.[
                  "modern.homepage.features-description-1"
                ] ??
                  "Every piece is made by skilled artisans using time-honored techniques."}
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                {themeSpecificFields?.["modern.homepage.features-title-2"] ??
                  "Sustainably Made"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {themeSpecificFields?.[
                  "modern.homepage.features-description-2"
                ] ??
                  "We source responsibly and prioritize natural, sustainable materials."}
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                {themeSpecificFields?.["modern.homepage.features-title-3"] ??
                  "Built to Last"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {themeSpecificFields?.[
                  "modern.homepage.features-description-3"
                ] ??
                  "Quality construction means pieces you will love for years to come."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {themeSpecificFields?.["modern.homepage.products-subtitle"] ??
                  "Curated Selection"}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
                {themeSpecificFields?.["modern.homepage.products-title"] ??
                  "Featured Pieces"}
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-foreground hover:text-muted-foreground hidden items-center gap-1 text-sm font-medium transition-colors md:flex"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12">
            <FeaturedProductsGrid />
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link
              href="/shop"
              className="text-foreground inline-flex items-center gap-1 text-sm font-medium"
            >
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Collection CTA */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {themeSpecificFields?.["modern.homepage.about-title"] ??
                  "Our Story"}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                {themeSpecificFields?.["modern.homepage.about-subtitle"] ??
                  "Where craftsmanship meets contemporary design"}
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed">
                {themeSpecificFields?.["modern.homepage.about-text"] ??
                  "We work directly with artisans from around the world to bring you pieces that tell a story. Every item in our collection is chosen for its quality, beauty, and the hands that made it."}
              </p>
              <Link
                href={
                  themeSpecificFields?.[
                    "modern.homepage.about-cta-button-link"
                  ] ?? "/about"
                }
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-8 inline-flex items-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors"
              >
                {themeSpecificFields?.[
                  "modern.homepage.about-cta-button-text"
                ] ?? "Learn More"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-4/3 overflow-hidden rounded-sm">
              <Image
                src={
                  themeSpecificFields?.["modern.homepage.about-image"] ??
                  "/placeholder.svg"
                }
                alt="Curated collection of modern home goods"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* <section className="bg-primary py-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 className="text-primary-foreground font-serif text-3xl md:text-4xl">
            Stay in the loop
          </h2>
          <p className="text-primary-foreground/70 mx-auto mt-4 max-w-md text-sm">
            Subscribe for first access to new arrivals, exclusive offers, and
            design inspiration.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            action="#"
            method="POST"
          >
            <input
              type="email"
              placeholder="Your email address"
              className="border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-primary-foreground flex-1 border bg-transparent px-4 py-3 text-sm focus:outline-none"
              aria-label="Email address"
              name="email"
              required
              autoComplete="email"
            />
            <button
              type="submit"
              className="bg-primary-foreground text-primary px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section> */}
    </div>
  );
}
