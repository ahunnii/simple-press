import type { Metadata } from "next";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { Badge } from "~/components/ui/badge";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { HappyBambooHorizontalProductCard } from "./happy-bamboo-product-card";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

export function HappyBambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const fields = resolveFields(customFields, [
    "happy-bamboo.shop-listing-heading",
    "happy-bamboo.shop-listing-intro",
  ]);

  const shopHeading = fields["happy-bamboo.shop-listing-heading"]!;
  const shopIntro = fields["happy-bamboo.shop-listing-intro"]!;

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl py-16 md:py-24">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">Eco-Friendly Products</Badge>
          <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
            {shopHeading}
          </h1>
          {shopIntro && (
            <p className="text-muted-foreground text-lg">{shopIntro}</p>
          )}
        </FadeIn>
        <StaggerContainer
          className="grid grid-cols-1 gap-6 py-12 md:py-20 lg:grid-cols-2"
          staggerDelay={0.12}
        >
          {business.products?.map((product, index) => (
            <StaggerItem key={product.id}>
              <HappyBambooHorizontalProductCard
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
                  additionalFields: product.additionalFields,
                  trackInventory: product.trackInventory,
                  inventoryQty: product.inventoryQty,
                  allowBackorders: product.allowBackorders,
                }}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </PageTransition>
  );
}
