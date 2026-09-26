"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
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
  featuredSmallLabel?: string;
  featuredTitle: string;
  featuredDescription: string;
  featuredButtonText: string;
  featuredButtonLink: string;
  /** "true"/"false" — mirrors the shop page's sale-badge-format setting. */
  saleBadgeFormat?: string;
  /**
   * True inside the visual editor preview. The live storefront hides this
   * section entirely when there are no products (see the homepage
   * orchestrator), but the preview keeps rendering it — with this
   * placeholder in place of the grid — so an owner setting up a fresh store
   * still has the hover/click hotspot to find and edit.
   */
  isPreview?: boolean;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};
export function HappyBambooFeaturedProducts({
  featuredProducts,
  featuredSmallLabel,
  featuredTitle,
  featuredDescription,
  featuredButtonText,
  featuredButtonLink,
  saleBadgeFormat,
  isPreview,
  sectionAttrs,
}: Props) {
  if (!featuredProducts?.length && !isPreview) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8" {...sectionAttrs}>
      <FadeIn direction="up">
        <div className="mb-12 space-y-6 text-center">
          {!!featuredSmallLabel && (
            <span
              className="text-primary text-sm font-semibold tracking-wider uppercase"
              {...fieldAttr("happy-bamboo.homepage-featured-small-label")}
            >
              {featuredSmallLabel}
            </span>
          )}
          <h2 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
            <span
              className="font-serif text-balance"
              {...fieldAttr("happy-bamboo.homepage-featured-title")}
            >
              {featuredTitle}
            </span>
          </h2>
          <p
            className="text-muted-foreground mx-auto mt-4 max-w-2xl"
            {...fieldAttr("happy-bamboo.homepage-featured-description")}
          >
            {featuredDescription}
          </p>
        </div>
      </FadeIn>
      {featuredProducts?.length ? (
        <StaggerContainer
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
          staggerDelay={0.12}
        >
          {featuredProducts.slice(0, 4).map((product, index) => (
            <StaggerItem key={product.id}>
              <HappyBambooProductCard
                product={product as Product}
                saleBadgeFormat={saleBadgeFormat}
                index={index}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <div className="bg-muted/40 mx-auto max-w-xl rounded-2xl py-16 text-center">
          <Package
            className="text-muted-foreground/50 mx-auto mb-4 size-10"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-lg">No products found</p>
        </div>
      )}
      <FadeIn direction="up" delay={0.3}>
        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link href={featuredButtonLink}>
              <span
                {...fieldAttr("happy-bamboo.homepage-featured-button-text")}
              >
                {featuredButtonText}
              </span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
