import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { GloveCarousel, GloveCharmCard, GloveSection } from "../shared";
import { gloveCardPricing } from "./glove-pricing";

type GloveHomeCharmsProps = {
  heading: string;
  /** Collection name, shown under each charm. */
  category: string;
  products: Product[];
  sectionAttrs?: Record<string, string>;
};

/**
 * Charms on a purple-to-white fade. Each card swings from its top edge on
 * hover or focus (signature moment 2). The caller hides the section when the
 * collection has no products.
 */
export function GloveHomeCharms({
  heading,
  category,
  products,
  sectionAttrs,
}: GloveHomeCharmsProps) {
  if (products.length === 0) return null;
  return (
    <GloveSection
      tone="fade"
      aria-labelledby={heading ? "glove-charms-heading" : undefined}
      aria-label={heading ? undefined : "Charms"}
      sectionAttrs={sectionAttrs}
      revealThreshold={0}
    >
      {heading ? (
        <h2
          id="glove-charms-heading"
          className="glove-display mb-8 text-center text-[clamp(30px,3.6vw,45px)] leading-none font-semibold text-[var(--glove-on-primary)] md:mb-10"
          {...fieldAttr("glove.homepage.charms-heading")}
        >
          {heading}
        </h2>
      ) : null}
      <div className="px-1 pb-6 md:px-4 md:pb-10">
        <GloveCarousel label={`${heading || "Charms"} carousel`}>
          {products.map((product) => {
            const pricing = gloveCardPricing(product);
            return (
              <GloveCharmCard
                key={product.id}
                name={product.name}
                category={category}
                image={product.images[0]?.url ?? "/placeholder.svg"}
                href={`/shop/${product.slug}`}
                price={pricing.price}
                maxPrice={pricing.maxPrice}
                compareAtPrice={pricing.compareAtPrice}
              />
            );
          })}
        </GloveCarousel>
      </div>
    </GloveSection>
  );
}
