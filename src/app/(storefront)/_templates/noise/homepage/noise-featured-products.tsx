import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

type NoiseFeaturedProductsProps = {
  featuredProducts: FeaturedProduct[];
  featuredTitle?: string;
  featuredDescription?: string;
  featuredButtonText?: string;
  featuredButtonLink?: string;
};

export function NoiseFeaturedProducts({
  featuredProducts,
  featuredTitle,
  featuredDescription,
  featuredButtonText,
  featuredButtonLink,
}: NoiseFeaturedProductsProps) {
  if (!featuredProducts.length) return null;

  const title = featuredTitle ?? "The Collection";
  const description =
    featuredDescription ?? "Handcrafted with intention. Worn with purpose.";
  const btnText = featuredButtonText ?? "View All";
  const btnLink = featuredButtonLink ?? "/shop";

  return (
    <section className="bg-secondary py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <FadeIn className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-muted-foreground mb-3 font-sans text-[9px] tracking-[0.4em] uppercase">
              Featured
            </p>
            <h2 className="text-foreground font-serif text-4xl font-light tracking-tight md:text-5xl">
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground mt-3 font-sans text-sm">
                {description}
              </p>
            )}
          </div>
          <Link
            href={btnLink}
            className="text-foreground inline-flex shrink-0 items-center gap-3 font-sans text-[10px] tracking-[0.3em] uppercase transition-opacity hover:opacity-60"
          >
            <span>{btnText}</span>
            <span className="bg-foreground h-px w-10" />
          </Link>
        </FadeIn>

        {/* Grid */}
        <StaggerContainer
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.08}
        >
          {featuredProducts.map((product, index) => (
            <StaggerItem key={product.id}>
              <NoiseProductCard
                product={{
                  id: product.id,
                  name: product.name,
                  description: product.description ?? "",
                  price:
                    product.variants.length > 0
                      ? (product.variants[0]?.price ?? 0)
                      : product.price,
                  image: product.images[0]?.url ?? "/placeholder.svg",
                  slug: product.slug ?? "",
                  additionalFields: product.additionalFields,
                  trackInventory: product.trackInventory,
                  inventoryQty: product.inventoryQty,
                  allowBackorders: product.allowBackorders,
                }}
                index={index}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
