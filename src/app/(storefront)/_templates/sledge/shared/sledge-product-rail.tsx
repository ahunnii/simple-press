import Link from "next/link";

import type { Product } from "~/types";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { SledgeProductCard } from "./sledge-product-card";

type SledgeProductRailProps = {
  heading: string;
  ctaText: string;
  ctaHref: string;
  products: ReadonlyArray<Product | Record<string, unknown>>;
  /** Maximum products to show — defaults to 4 */
  limit?: number;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeProductRail({
  heading,
  ctaText,
  ctaHref,
  products,
  limit = 4,
  sectionAttrs,
}: SledgeProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section className="bg-white px-7 py-16 md:py-20" {...sectionAttrs}>
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-12 flex items-end justify-between gap-6">
          <h2 className="sl-rail-heading font-heading font-bold uppercase">
            {heading}
          </h2>
          <Link
            href={ctaHref}
            className="sl-cta-pill flex shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70"
          >
            {ctaText} →
          </Link>
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4"
          staggerDelay={0.07}
        >
          {shown.map((product, index) => (
            <StaggerItem key={product.id as string}>
              <SledgeProductCard product={product as Product} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
