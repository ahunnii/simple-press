"use client";

import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/react";

import { GloveCarousel, GloveMistPanel, GloveProductCard } from "../shared";

type Props = {
  productId: string;
  heading: string;
};

/**
 * Related products (B6.9): --glove-mist rounded panel, Lato 24px heading,
 * 4-up carousel of white product cards with page dots. `getRelated` is
 * prefetched by the route, so this hydrates with data. Hidden when empty.
 */
export function GloveRelatedProducts({ productId, heading }: Props) {
  const { data } = api.product.getRelated.useQuery({ productId });
  const products = (data ?? []) as Product[];
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="glove-related-heading">
      <GloveMistPanel className="px-4 py-6 md:px-6 md:py-8">
        <h2
          id="glove-related-heading"
          className="glove-body mb-5 text-[24px] font-normal text-[var(--glove-ink)]"
          {...fieldAttr("glove.product.related-heading")}
        >
          {heading}
        </h2>
        <GloveCarousel
          // Distinct from the section's own name (axe landmark-unique).
          label={`${heading || "Related products"} carousel`}
          showDots
        >
          {products.map((product) => (
            <GloveProductCard
              key={product.id}
              product={product}
              surface="card"
              className="h-full"
            />
          ))}
        </GloveCarousel>
      </GloveMistPanel>
    </section>
  );
}
