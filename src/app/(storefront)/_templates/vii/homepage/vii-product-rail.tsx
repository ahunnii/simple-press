"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";
import { ViiProductCard } from "../shared/vii-product-card";

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
    <section
      aria-labelledby={heading ? "vii-product-rail-heading" : undefined}
      aria-label={
        heading ? undefined : overline?.trim() ? overline : "Featured products"
      }
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(64px, 9vw, 112px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal-group${visible ? "is-visible" : ""}`}
        style={{ maxWidth: 1200, margin: "0 auto" }}
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
          {overline && (
            <ViiOverline tone="light" style={{ marginBottom: 6 }}>
              {overline}
            </ViiOverline>
          )}
          {heading && (
            <h2
              id="vii-product-rail-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.6vw, 44px)",
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
            </h2>
          )}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              background:
                "color-mix(in srgb, var(--vii-navy) 20%, transparent)",
              marginTop: "clamp(16px, 2vw, 22px)",
            }}
          />
        </div>

        {/* Product grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "clamp(20px, 3vw, 36px)",
          }}
        >
          {shown.map((product, i) => (
            <div
              key={product.id}
              className="vii-reveal-item"
              style={{ "--i": Math.min(i + 1, 7) } as React.CSSProperties}
            >
              <ViiProductCard
                product={product as unknown as Product}
                index={i}
              />
            </div>
          ))}
        </div>

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
            <Link
              href={ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--vii-navy)",
                textDecoration: "none",
                borderBottom: "1px solid var(--vii-copper)",
                paddingBottom: 4,
              }}
            >
              {ctaText}
              <ArrowRight
                aria-hidden="true"
                style={{ width: 14, height: 14 }}
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
