import Link from "next/link";

import type { Product } from "~/types";
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
    <section className="border-b border-foreground/15 py-24" style={{ background: "var(--vn-bone)" }}>
      <div className="mx-auto max-w-7xl px-7">
        {/* Section header */}
        <FadeIn className="mb-14 flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-foreground/20 pb-8">
          <div>
            <p className="mb-4 font-mono text-[9.5px] tracking-[0.4em] uppercase text-muted-foreground">
              Section / 03 — Featured
            </p>
            <h2
              className="font-serif italic leading-tight tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.02em" }}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-3 font-sans text-sm text-muted-foreground max-w-[44ch]">
                {description}
              </p>
            )}
          </div>
          <Link
            href={btnLink}
            className="inline-flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase transition-opacity hover:opacity-60"
          >
            <span>{btnText}</span>
            <span className="h-px w-10 bg-foreground" />
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
                product={product as unknown as Product}
                index={index}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
