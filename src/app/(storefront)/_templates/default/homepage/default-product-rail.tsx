import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
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
  overline?: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  products: FeaturedProduct[];
  limit?: number;
};

export function DefaultProductRail({
  title,
  overline,
  description,
  ctaText,
  ctaHref,
  products,
  limit = 4,
}: DefaultProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section className="px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-12 flex flex-col items-center justify-center space-y-3 text-center">
          {overline && (
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {overline}
            </p>
          )}
          <h2 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground max-w-md text-sm">{description}</p>
          )}
          <Link
            href={ctaHref}
            className="border-border text-foreground hover:bg-muted mt-2 inline-flex items-center gap-1 border px-6 py-2 text-xs font-medium tracking-widest uppercase transition-colors"
          >
            {ctaText} →
          </Link>
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.07}
        >
          {shown.map((product, index) => (
            <StaggerItem key={product.id}>
              <DefaultProductCard
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
