import Link from "next/link";

import type { DefaultHomepageTemplateProps } from "../../types";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultParallaxHero } from "./default-parallax-hero";
import { DefaultProductRail } from "./default-product-rail";

export async function DefaultHomePage({
  business,
}: DefaultHomepageTemplateProps) {
  const homepage = await api.business.getHomepage();
  const products = homepage?.products ?? [];

  const f = resolveFields(business?.siteContent?.customFields, [
    "default.homepage.hero-image",
    "default.homepage.hero-description",
    "default.homepage.hero-button-text",
    "default.homepage.hero-button-link",
    "default.homepage.hero-button-2-text",
    "default.homepage.hero-button-2-link",
    "default.homepage.rail-one-collection",
    "default.homepage.rail-one-title",
    "default.homepage.rail-one-button-text",
    "default.homepage.rail-one-button-link",
    "default.homepage.rail-two-collection",
    "default.homepage.rail-two-title",
    "default.homepage.rail-two-button-text",
    "default.homepage.rail-two-button-link",
    "default.homepage.cta-heading",
    "default.homepage.cta-description",
  ]);

  const rail1Id = f["default.homepage.rail-one-collection"] ?? "";
  const rail2Id = f["default.homepage.rail-two-collection"] ?? "";

  const [rail1Data, rail2Data] = await Promise.all([
    rail1Id
      ? api.collections.getProductsByCollectionId(rail1Id)
      : Promise.resolve(null),
    rail2Id
      ? api.collections.getProductsByCollectionId(rail2Id)
      : Promise.resolve(null),
  ]);

  const railOneProducts = rail1Data?.products ?? products.slice(0, 4);
  const railTwoProducts = rail2Data?.products ?? products.slice(4, 8);

  const railOneCtaHref = rail1Data
    ? `/collections/${rail1Data.collection.slug}`
    : (f["default.homepage.rail-one-button-link"] ?? "/shop");

  const railTwoCtaHref = rail2Data
    ? `/collections/${rail2Data.collection.slug}`
    : (f["default.homepage.rail-two-button-link"] ?? "/shop");

  return (
    <HydrateClient>
      <PageTransition>
        {/* Parallax Hero */}
        <DefaultParallaxHero
          imageUrl={f["default.homepage.hero-image"] ?? "/placeholder.svg"}
          title={business.name}
          description={f["default.homepage.hero-description"]}
          primaryText={f["default.homepage.hero-button-text"] ?? "Shop Now"}
          primaryHref={f["default.homepage.hero-button-link"] ?? "/shop"}
          secondaryText={f["default.homepage.hero-button-2-text"]}
          secondaryHref={f["default.homepage.hero-button-2-link"]}
        />

        {/* Rail 1 */}
        <DefaultProductRail
          title={
            rail1Data?.collection.name ??
            (f["default.homepage.rail-one-title"] ?? "Featured Products")
          }
          description={rail1Data?.collection.description ?? undefined}
          ctaText={f["default.homepage.rail-one-button-text"] ?? "Shop All"}
          ctaHref={railOneCtaHref}
          products={railOneProducts}
        />

        {/* Rail 2 — only shown when there are enough products or a collection is set */}
        {railTwoProducts.length > 0 && (
          <DefaultProductRail
            overline="New Arrivals"
            title={
              rail2Data?.collection.name ??
              (f["default.homepage.rail-two-title"] ?? "New Arrivals")
            }
            description={rail2Data?.collection.description ?? undefined}
            ctaText={f["default.homepage.rail-two-button-text"] ?? "Shop All"}
            ctaHref={railTwoCtaHref}
            products={railTwoProducts}
          />
        )}

        {/* CTA strip */}
        {(f["default.homepage.cta-heading"] ??
          f["default.homepage.cta-description"]) && (
          <section className="bg-primary text-primary-foreground py-16">
            <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {f["default.homepage.cta-heading"]}
              </h2>
              {f["default.homepage.cta-description"] && (
                <p className="text-primary-foreground/80 mt-4 text-base">
                  {f["default.homepage.cta-description"]}
                </p>
              )}
              <Link
                href="/about"
                className="mt-8 inline-flex border border-white px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-80"
              >
                Learn More
              </Link>
            </div>
          </section>
        )}
      </PageTransition>
    </HydrateClient>
  );
}
