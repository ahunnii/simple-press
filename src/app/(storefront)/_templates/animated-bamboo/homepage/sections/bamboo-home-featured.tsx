import Link from "next/link";
import { Package } from "lucide-react";

import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { BambooProductCard } from "../../shared/bamboo-product-card";
import { BambooReveal, BambooRevealGroup } from "../../shared/bamboo-reveal";

/**
 * Featured products — "Our Curated Collection". Real DB products only, on
 * the shared `BambooProductCard` (restyled concurrently on the
 * `.bamboo-card`/`.bamboo-blob`/`.bamboo-sprout` system — rendered here with
 * its existing props signature, unmodified). The mockup's illustrated
 * sample cards (mockup-b lines ~857-895) are NOT ported — catalog stays
 * DB-driven per design.md.
 */

type FeaturedProps = {
  sectionAttrs: Record<string, string>;
  titleFieldKey: string;
  title: string;
  descriptionFieldKey: string;
  description: string;
  buttonTextFieldKey: string;
  buttonText: string;
  buttonLink: string;
  products: Product[];
};

export function BambooHomeFeatured({
  sectionAttrs,
  titleFieldKey,
  title,
  descriptionFieldKey,
  description,
  buttonTextFieldKey,
  buttonText,
  buttonLink,
  products,
}: FeaturedProps) {
  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-collection-h"
      className="mx-auto w-[min(1200px,calc(100%-48px))] pt-[clamp(28px,3vw,48px)] pb-[var(--bamboo-sp)]"
    >
      <BambooReveal className="mx-auto max-w-[660px] text-center">
        <h2
          id="bamboo-collection-h"
          {...fieldAttr(titleFieldKey)}
          className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] text-[var(--bamboo-pine)]"
        >
          {title}
        </h2>
        <p
          {...fieldAttr(descriptionFieldKey)}
          className="mx-auto mt-4 max-w-[56ch] text-[var(--bamboo-ink-soft)]"
        >
          {description}
        </p>
      </BambooReveal>

      {products.length > 0 ? (
        <BambooRevealGroup className="mt-[52px] grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 3).map((product, index) => (
            <div
              key={product.id}
              className="bamboo-reveal-item"
              style={{ "--i": index } as React.CSSProperties}
            >
              <BambooProductCard index={index} product={product} />
            </div>
          ))}
        </BambooRevealGroup>
      ) : (
        <div className="mt-[52px] flex flex-col items-center justify-center gap-4 text-center">
          <Package
            className="h-12 w-12 text-[var(--bamboo-muted)]"
            aria-hidden="true"
          />
          <p className="text-[var(--bamboo-ink-soft)]">No products found</p>
        </div>
      )}

      <BambooReveal className="mt-8 flex justify-center">
        <Link
          href={buttonLink}
          className="bamboo-swipe text-[var(--bamboo-pine)]"
        >
          <span {...fieldAttr(buttonTextFieldKey)}>{buttonText}</span> →
        </Link>
      </BambooReveal>
    </section>
  );
}
