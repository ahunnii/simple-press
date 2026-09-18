import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscProductGrid } from "../shared/umsc-product-grid";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  emptyText: string;
  products: Product[];
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscFeaturedSection (homepage.featured) — the paper shelf directly beneath
 * the hero: hairline top + bottom, tight 26px padding, four `UmscProductCard`s
 * from a `collection` field (fallback resolved by the parent). Heading is
 * visually hidden so the shelf reads as the hero's bottom edge rather than a
 * new section (design.md "Homepage → Featured shelf").
 */
export function UmscFeaturedSection({
  heading,
  emptyText,
  products,
  sectionAttrs,
}: Props) {
  const shown = products.slice(0, 4);

  return (
    <UmscSection
      tone="paper"
      padded={false}
      aria-labelledby="umsc-featured-heading"
      className="border-y border-[var(--umsc-line)]"
      style={{
        paddingTop: 26,
        paddingBottom: 26,
        paddingLeft: "var(--umsc-section-pad-x)",
        paddingRight: "var(--umsc-section-pad-x)",
      }}
      sectionAttrs={sectionAttrs}
    >
      <UmscHeading
        as="h2"
        id="umsc-featured-heading"
        fieldKey="umsc.homepage.featured-heading"
        className="sr-only"
      >
        {heading}
      </UmscHeading>

      {shown.length > 0 ? (
        <UmscRevealGroup>
          <UmscProductGrid products={shown} />
        </UmscRevealGroup>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <UmscImageFallback key={i} aspect="1 / 1" />
            ))}
          </div>
          <p
            {...fieldAttr("umsc.homepage.featured-empty-text")}
            className="umsc-sans text-center text-[14px] text-[var(--umsc-muted)]"
          >
            {emptyText}
          </p>
        </div>
      )}
    </UmscSection>
  );
}
