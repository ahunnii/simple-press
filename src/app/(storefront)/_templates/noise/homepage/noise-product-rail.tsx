import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

// Accepts either the homepage's featured slice or `getRailProducts` output —
// both are cast to `Product` at the card, which reads only shared fields.
type RailProduct =
  | NonNullable<RouterOutputs["business"]["getHomepage"]>["products"][number]
  | RouterOutputs["product"]["getRailProducts"][number];

type NoiseProductRailProps = {
  title: string;
  overline?: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  products: RailProduct[];
  /** Maximum products to show — defaults to 4 */
  limit?: number;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /**
   * Field key for the `overline` prop, when it's a direct (non-collection-
   * overridden) resolved field value — this component renders two rail
   * instances bound to different fields, so the key is passed per-instance.
   */
  overlineFieldKey?: string;
  /** Field key for the `ctaText` prop, same rationale as `overlineFieldKey`. */
  ctaTextFieldKey?: string;
  /** Field key for the `title` prop, same rationale as `overlineFieldKey`. */
  titleFieldKey?: string;
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
  overlineFieldKey,
  ctaTextFieldKey,
  titleFieldKey,
}: NoiseProductRailProps) {
  const shown = products.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section
      className="border-foreground/15 px-7 py-16"
      style={{ background: "var(--vn-paper)" }}
      {...sectionAttrs}
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Rail header */}
        <FadeIn className="border-foreground/20 mb-12 flex flex-col items-center justify-center space-y-4 pb-7">
          {overline && (
            <p
              className="font-mono text-[10px] tracking-[.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
              {...(overlineFieldKey ? fieldAttr(overlineFieldKey) : {})}
            >
              {overline}
            </p>
          )}
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
            {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
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
            <span {...(ctaTextFieldKey ? fieldAttr(ctaTextFieldKey) : {})}>
              {ctaText}
            </span>{" "}
            →
          </Link>
        </FadeIn>

        {/* Centered wrap row — fixed per-breakpoint widths (2 / 3 / 4 across)
            so a short row of 1–3 products sits centered instead of hugging
            the left edge of an empty grid. Widths subtract the gap share. */}
        <StaggerContainer
          className="flex flex-wrap justify-center gap-5"
          staggerDelay={0.07}
        >
          {shown.map((product, index) => (
            <StaggerItem
              key={product.id}
              className="w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)]"
            >
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
