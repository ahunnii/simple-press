import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { DefaultProductCard } from "../shared/default-product-card";

type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

type DefaultProductRailProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  products: FeaturedProduct[];
  limit?: number;
  /**
   * Optional passthrough attributes spread on the root <section>.
   * Used by the preview overlay to annotate sections with data-sp-group.
   * Pattern: {...sectionGroupAttr("homepage", "rails")}
   */
  sectionAttrs?: Record<string, string>;
};

export function DefaultProductRail({
  title,
  eyebrow,
  description,
  ctaText,
  ctaHref,
  products,
  limit = 4,
  sectionAttrs,
}: DefaultProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section className="px-6 py-24 lg:px-8" {...sectionAttrs}>
      <div className="mx-auto max-w-[1440px]">
        <FadeIn className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            {eyebrow && (
              <p className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                {eyebrow}
              </p>
            )}
            <h2 className="text-foreground font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground max-w-md text-sm">
                {description}
              </p>
            )}
          </div>
          <Link
            href={ctaHref}
            className="inline-flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
          >
            {ctaText} <span aria-hidden="true">→</span>
          </Link>
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.07}
        >
          {shown.map((product, index) => (
            <StaggerItem key={product.id}>
              <DefaultProductCard product={product} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
