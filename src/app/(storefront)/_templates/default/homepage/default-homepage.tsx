import Image from "next/image";
import Link from "next/link";

import type { DefaultHomepageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultProductCard } from "../shared/default-product-card";

export async function DefaultHomePage({
  business,
}: DefaultHomepageTemplateProps) {
  const featuredProducts = await api.product.getFeatured();

  const f = resolveFields(business?.siteContent?.customFields, [
    "default.homepage.hero-image",
    "default.homepage.hero-description",
    "default.homepage.hero-button-text",
    "default.homepage.hero-button-link",
    "default.homepage.hero-button-2-text",
    "default.homepage.hero-button-2-link",
    "default.homepage.featured-products-heading",
    "default.homepage.cta-heading",
    "default.homepage.cta-description",
    "default.homepage.cta-image",
  ]);

  return (
    <HydrateClient>
      <PageTransition>
        {/* Hero Banner */}
        <section className="relative">
          <div className="container mx-auto px-4 py-12 md:px-6 md:py-24 lg:py-32">
            <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  {business.name}
                </h1>
                <p className="text-muted-foreground max-w-[600px] md:text-xl">
                  {f["default.homepage.hero-description"]}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="font-medium" asChild>
                    <Link
                      href={
                        f["default.homepage.hero-button-link"] ?? "/products"
                      }
                    >
                      {f["default.homepage.hero-button-text"]}
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-medium"
                    asChild
                  >
                    <Link
                      href={f["default.homepage.hero-button-2-link"] ?? "/shop"}
                    >
                      {f["default.homepage.hero-button-2-text"]}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative h-[300px] overflow-hidden rounded-xl sm:h-[400px] lg:h-[500px]">
                <Image
                  src={f["default.homepage.hero-image"] ?? "/placeholder.svg"}
                  alt={business.name ?? "Hero Image"}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="mx-auto py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
              {f["default.homepage.featured-products-heading"]}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts?.map((product, index) => (
                <DefaultProductCard
                  key={product.id}
                  product={product as Product}
                  index={index}
                />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">View All Products</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-primary text-primary-foreground mx-auto py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center md:space-y-6">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {f["default.homepage.cta-heading"]}
              </h2>
              <p className="text-primary-foreground/90 max-w-[600px] md:text-lg">
                {f["default.homepage.cta-description"]}
              </p>
            </div>
          </div>
        </section>
      </PageTransition>
    </HydrateClient>
  );
}
