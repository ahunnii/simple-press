import type { DefaultProductsPageTemplateProps } from "../../types";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseProductCard } from "./noise-product-card";

export function NoiseShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "noise.shop-listing-heading",
    "noise.shop-listing-intro",
  ]);

  const shopHeading = f["noise.shop-listing-heading"] ?? "The Collection";
  const shopIntro = f["noise.shop-listing-intro"] ?? "";

  return (
    <PageTransition>
      {/* Page header */}
      <section className="border-b border-border bg-secondary py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            Visual Noise Detroit
          </p>
          <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {shopHeading}
          </h1>
          {shopIntro && (
            <p className="mt-5 max-w-xl font-sans text-base text-muted-foreground">
              {shopIntro}
            </p>
          )}
        </FadeIn>
      </section>

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <StaggerContainer
          className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.07}
        >
          {business.products?.map((product, index) => (
            <StaggerItem key={product.id}>
              <NoiseProductCard
                index={index}
                product={{
                  id: product.id,
                  name: product.name,
                  description: product.description ?? "",
                  price:
                    product.variants.length > 0
                      ? (product.variants[0]?.price ?? 0)
                      : product.price,
                  image: product.images[0]?.url ?? "/placeholder.svg",
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

        {(!business.products || business.products.length === 0) && (
          <FadeIn className="py-24 text-center">
            <p className="font-serif text-2xl font-light text-muted-foreground">
              The collection is coming soon.
            </p>
          </FadeIn>
        )}
      </section>
    </PageTransition>
  );
}
