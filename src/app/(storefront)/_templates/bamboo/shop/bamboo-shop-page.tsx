import type { Metadata } from "next";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooProductCard } from "../shared/bamboo-product-card";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

export async function BambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.products.listing-title",
    "bamboo.products.listing-intro",
  ]);

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <div {...sectionGroupAttr("products", "listing")} className="mb-12">
            <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">
                {f["bamboo.products.listing-title"]}
              </span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl font-sans">
              {f["bamboo.products.listing-intro"]}
            </p>
          </div>
        </FadeIn>
        <StaggerContainer
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.12}
        >
          {business.products?.map((product, index) => (
            <StaggerItem key={product.id}>
              <BambooProductCard
                key={product.id}
                index={index}
                product={product}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </PageTransition>
  );
}
