import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

type NoiseProductRailProps = {
  title: string;
  overline?: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  products: FeaturedProduct[];
  /** Maximum products to show — defaults to 4 */
  limit?: number;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function NoiseProductRail({
  title,
  overline,
  description,
  ctaText,
  ctaHref,
  products,
  limit = 4,
  sectionAttrs,
}: NoiseProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section
      className="border-foreground/15 px-7 py-16"
      style={{ background: "var(--vn-paper)" }}
      {...sectionAttrs}
    >
      <div className="mx-auto max-w-7xl">
        {/* Rail header */}
        <FadeIn className="border-foreground/20 mb-12 flex flex-col items-center justify-center space-y-4 pb-7">
          {overline && (
            <p className="font-mono text-[10px] tracking-[.22em] uppercase opacity-50">
              {overline}
            </p>
          )}
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          {description && (
            <p className="max-w-md text-center text-sm opacity-60">
              {description}
            </p>
          )}
          <Link
            href={ctaHref}
            className="flex shrink-0 items-center gap-3 px-3.5 py-2 font-mono text-[10px] tracking-[.22em] uppercase transition-opacity hover:opacity-60"
            style={{
              border: "1px solid var(--vn-ink)",

              color: "var(--vn-ink)",
            }}
          >
            {ctaText} →
          </Link>
        </FadeIn>

        {/* 4-column product grid */}
        <StaggerContainer
          className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.07}
        >
          {shown.map((product, index) => (
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
