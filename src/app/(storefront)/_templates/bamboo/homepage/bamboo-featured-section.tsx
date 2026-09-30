import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";
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
  /** B2.5: gates the field-driven CTA when its href names an off flag. */
  isEnabled: (key: string) => boolean;
};

export function BambooFeaturedSection({
  customFields,
  products,
  isEnabled,
}: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.featured-eyebrow",
    "bamboo.homepage.featured-title",
    "bamboo.homepage.featured-description",
    "bamboo.homepage.featured-button-text",
    "bamboo.homepage.featured-button-link",
  ]);

  const buttonText = f["bamboo.homepage.featured-button-text"] ?? "";

  // B2.5: hide the CTA (never swap in another destination) when its href
  // names a flag that's off. The section itself already requires
  // `isEnabled("products")` to render at all (see `bamboo-homepage.tsx`), so
  // this only bites when a merchant points the button at a different,
  // flag-gated route.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so an empty saved value also falls back
  const buttonHref = f["bamboo.homepage.featured-button-link"] || "/shop";
  const buttonFlag = navHrefFlag(buttonHref);
  const showButton =
    buttonText !== "" && (buttonFlag === null || isEnabled(buttonFlag));

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

        {showButton ? (
          <FadeIn direction="up" delay={0.3}>
            <div className="mt-12 text-center">
              <Link
                href={buttonHref}
                className="group text-foreground inline-flex items-center gap-2.5 border-b border-[var(--bam-gold)]/50 pb-1 text-sm font-semibold tracking-widest uppercase transition-colors hover:border-[var(--bam-gold)] hover:text-[var(--bam-forest)]"
              >
                <span {...fieldAttr("bamboo.homepage.featured-button-text")}>
                  {buttonText}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </FadeIn>
        ) : null}
      </div>
    </section>
  );
}
