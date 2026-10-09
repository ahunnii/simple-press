import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { GloveProductCard, GloveSection } from "../shared";

type GloveHomeFeaturedProps = {
  heading: string;
  products: Product[];
  sectionAttrs?: Record<string, string>;
};

/**
 * Full-bleed primary band with the heading on the left and 4 to 5 real
 * products as white cards. The caller hides the section when there are no
 * products.
 */
export function GloveHomeFeatured({
  heading,
  products,
  sectionAttrs,
}: GloveHomeFeaturedProps) {
  if (products.length === 0) return null;
  const five = products.length >= 5;
  return (
    <GloveSection
      tone="primary"
      aria-labelledby={heading ? "glove-featured-heading" : undefined}
      aria-label={heading ? undefined : "Featured gloves"}
      sectionAttrs={sectionAttrs}
      // Product cards are commerce content: they render at once, no fade.
      reveal={false}
    >
      {heading ? (
        <h2
          id="glove-featured-heading"
          className="glove-display max-w-[28ch] text-[clamp(22px,2.4vw,30px)] leading-[1.3] font-medium text-[var(--glove-on-primary)]"
          {...fieldAttr("glove.homepage.featured-heading")}
        >
          {heading}
        </h2>
      ) : null}
      <ul
        className={`m-0 mt-8 grid list-none grid-cols-2 gap-3 p-0 md:mt-10 md:grid-cols-4 md:gap-5 ${five ? "lg:grid-cols-5 max-lg:[&>li:nth-child(5)]:hidden" : ""}`}
      >
        {products.map((product) => (
          <li key={product.id}>
            <GloveProductCard product={product} surface="card" />
          </li>
        ))}
      </ul>
    </GloveSection>
  );
}
