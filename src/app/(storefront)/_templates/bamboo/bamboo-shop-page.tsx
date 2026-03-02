import type { Metadata } from "next";

import type { DefaultProductsPageTemplateProps } from "../types";

import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "./bamboo-animations";
import { BambooProductCard } from "./bamboo-product-card";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

export function BambooShopPage({ business }: DefaultProductsPageTemplateProps) {
  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <div className="mb-12">
            <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">Our Collection</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl font-sans">
              Every product is 100% bamboo, tree-free, and crafted to the
              highest standard. Choose the option that fits your home.
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
                product={{
                  id: product.id,
                  name: product.name,
                  description:
                    product.description ?? "No description available",
                  price:
                    product?.variants?.length > 0
                      ? (product.variants[0]?.price ?? 0)
                      : product.price,
                  originalPrice: null,
                  image: product.images[0]?.url ?? "/placeholder.svg",
                  badge: null,
                  category: "",
                  slug: product.slug ?? "",
                }}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </PageTransition>
  );
}
