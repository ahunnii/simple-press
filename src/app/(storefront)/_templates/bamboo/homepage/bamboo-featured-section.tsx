import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooProductCard } from "../shared/bamboo-product-card";
import { BambooSectionHeading } from "./bamboo-section-heading";

type Props = {
  customFields: unknown;
  products: NonNullable<RouterOutputs["business"]["getHomepage"]>["products"];
};

export function BambooFeaturedSection({ customFields, products }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.featured-eyebrow",
    "bamboo.homepage.featured-title",
    "bamboo.homepage.featured-description",
    "bamboo.homepage.featured-button-text",
  ]);

  // happy-bamboo's featured grid: four products, two up from md.
  const featured = products?.slice(0, 4) ?? [];

  return (
    <section
      {...sectionGroupAttr("homepage", "featured")}
      aria-label="Featured products"
      className="bg-[var(--bam-cream)]"
    >
      {/* happy-bamboo's featured band is the one short band on the page
          (`py-20`, no md bump) — the tighter rhythm is what sets the product
          grid apart from the editorial bands on either side of it. */}
      <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <BambooSectionHeading
            eyebrow={f["bamboo.homepage.featured-eyebrow"] ?? ""}
            eyebrowFieldKey="bamboo.homepage.featured-eyebrow"
            heading={f["bamboo.homepage.featured-title"] ?? ""}
            headingFieldKey="bamboo.homepage.featured-title"
            lede={f["bamboo.homepage.featured-description"] ?? ""}
            ledeFieldKey="bamboo.homepage.featured-description"
            className="mb-12"
          />
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
          staggerDelay={0.12}
        >
          {featured.map((product, index) => (
            <StaggerItem key={product.id}>
              <BambooProductCard index={index} product={product as Product} />
            </StaggerItem>
          ))}
          {products?.length === 0 && (
            <StaggerItem
              key="no-products"
              className="col-span-full rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] px-6 py-16"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Package
                  className="mb-4 size-10 text-[var(--bam-gold)]"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground text-lg">
                  No products found
                </p>
              </div>
            </StaggerItem>
          )}
        </StaggerContainer>

        <FadeIn direction="up" delay={0.3}>
          <div className="mt-12 text-center">
            <Link
              href="/shop"
              className="group text-foreground inline-flex items-center gap-2.5 border-b border-[var(--bam-gold)]/50 pb-1 text-sm font-semibold tracking-widest uppercase transition-colors hover:border-[var(--bam-gold)] hover:text-[var(--bam-forest)]"
            >
              <span {...fieldAttr("bamboo.homepage.featured-button-text")}>
                {f["bamboo.homepage.featured-button-text"] ?? ""}
              </span>
              <ArrowRight
                className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
