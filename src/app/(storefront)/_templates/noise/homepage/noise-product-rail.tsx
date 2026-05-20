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

type NoiseProductRailProps = {
  title: string;
  overline?: string;
  ctaText: string;
  ctaHref: string;
  products: FeaturedProduct[];
  /** Maximum products to show — defaults to 4 */
  limit?: number;
};

export function NoiseProductRail({
  title,
  overline,
  ctaText,
  ctaHref,
  products,
  limit = 4,
}: NoiseProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section
      className="border-b border-foreground/15 px-7 py-24"
      style={{ background: "var(--vn-paper)" }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Rail header */}
        <FadeIn className="mb-12 flex items-end justify-between border-b border-foreground/20 pb-7">
          <div>
            <p
              className="font-mono text-[9.5px] tracking-[.28em] uppercase mb-3"
              style={{ color: "var(--vn-steel)" }}
            >
              {overline ?? "Collection"}
            </p>
            <h2
              className="font-serif italic leading-tight tracking-tight"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
          </div>
          <Link
            href={ctaHref}
            className="font-mono text-[10px] tracking-[.22em] uppercase transition-opacity hover:opacity-60 flex items-center gap-3 flex-shrink-0"
            style={{
              borderBottom: "1px solid var(--vn-ink)",
              paddingBottom: "4px",
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
              <NoiseProductCard product={product as unknown as Product} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
