"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { HappyBambooProductCard } from "../shared/happy-bamboo-product-card";

type Props = {
  featuredProducts: NonNullable<
    RouterOutputs["business"]["getHomepage"]
  >["products"];
  featuredTitle?: string;
  featuredDescription?: string;
  featuredButtonText?: string;
  featuredButtonLink?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};
export function HappyBambooFeaturedProducts({
  featuredProducts,
  featuredTitle = "Our Curated Collection",
  featuredDescription = "Every product is 100% bamboo, tree-free, and crafted to the highest standard. No compromises.",
  featuredButtonText = "View All Products",
  featuredButtonLink = "/shop",
  sectionAttrs,
}: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8" {...sectionAttrs}>
      <FadeIn direction="up">
        <div className="mb-12 space-y-6 text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Happy Bamboo
          </span>
          <h2 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
            <span className="font-serif text-balance">{featuredTitle}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
            {featuredDescription}
          </p>
        </div>
      </FadeIn>
      <StaggerContainer
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
        staggerDelay={0.12}
      >
        {featuredProducts?.slice(0, 4).map((product, index) => (
          <StaggerItem key={product.id}>
            <HappyBambooProductCard
              product={product as Product}
              index={index}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
      <FadeIn direction="up" delay={0.3}>
        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link href={featuredButtonLink ?? "/shop"}>
              {featuredButtonText}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
