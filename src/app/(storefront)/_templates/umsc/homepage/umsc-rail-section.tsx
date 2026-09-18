import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscProductGrid } from "../shared/umsc-product-grid";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  ctaLabel: string;
  ctaUrl: string;
  emptyText: string;
  products: Product[];
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscRailSection (homepage.rail) — white band, section head with h2 +
 * "View all →" on the right (Urban Wick rhythm), second `collection`-field
 * rail of four cards (design.md "Homepage → New this season").
 */
export function UmscRailSection({
  heading,
  ctaLabel,
  ctaUrl,
  emptyText,
  products,
  sectionAttrs,
}: Props) {
  const shown = products.slice(0, 4);

  return (
    <UmscSection
      tone="white"
      aria-labelledby="umsc-rail-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <UmscHeading
          as="h2"
          id="umsc-rail-heading"
          fieldKey="umsc.homepage.rail-heading"
        >
          {heading}
        </UmscHeading>
        {ctaLabel && (
          <UmscButton
            variant="link"
            href={ctaUrl}
            fieldKey="umsc.homepage.rail-cta-label"
          >
            {ctaLabel}
          </UmscButton>
        )}
      </div>

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
            {...fieldAttr("umsc.homepage.rail-empty-text")}
            className="umsc-sans text-center text-[14px] text-[var(--umsc-muted)]"
          >
            {emptyText}
          </p>
        </div>
      )}
    </UmscSection>
  );
}
