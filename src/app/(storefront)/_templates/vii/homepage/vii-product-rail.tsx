"use client";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiCtaLink } from "../shared/vii-cta-link";
import { ViiProductGrid } from "../shared/vii-product-grid";
import { ViiSection } from "../shared/vii-section";
import { ViiSectionHeading } from "../shared/vii-section-heading";

type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

type Props = {
  overline?: string;
  heading: string;
  ctaText: string;
  ctaHref: string;
  products: FeaturedProduct[];
  /** Maximum products to show — defaults to 4 */
  limit?: number;
};

export function ViiProductRail({
  overline,
  heading,
  ctaText,
  ctaHref,
  products,
  limit = 4,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <ViiSection
      tone="paper"
      aria-labelledby={heading ? "vii-product-rail-heading" : undefined}
      aria-label={
        heading ? undefined : overline?.trim() ? overline : "Featured products"
      }
      revealRef={ref}
      revealVisible={visible}
    >
      {/* Header — left-aligned label + heading with a hairline rule */}
      <div
        className="vii-reveal-item"
        style={
          {
            "--i": 0,
            marginBottom: "clamp(32px, 4.5vw, 52px)",
          } as React.CSSProperties
        }
      >
        <ViiSectionHeading
          overline={overline}
          heading={heading}
          headingId="vii-product-rail-heading"
          tone="light"
        />
      </div>

      {/* Product grid */}
      <ViiProductGrid products={shown as unknown as Product[]} />

      {/* CTA */}
      {ctaText && (
        <div
          className="vii-reveal-item"
          style={
            {
              "--i": Math.min(shown.length + 1, 8),
              textAlign: "center",
              marginTop: "clamp(36px, 5vw, 56px)",
            } as React.CSSProperties
          }
        >
          <ViiCtaLink href={ctaHref}>{ctaText}</ViiCtaLink>
        </div>
      )}
    </ViiSection>
  );
}
