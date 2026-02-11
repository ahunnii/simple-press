import type { CardProduct } from "./modern-product-card";
import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { ModernProductsGrid } from "./modern-products-grid";

export function ModernProductsPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  const products = business.products as CardProduct[];

  return (
    <div className="font-sans antialiased">
      <StorefrontHeader business={business} />

      <div className="bg-background">
        {/* Page Header */}
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Collection
            </p>
            <h1 className="text-foreground mt-2 font-serif text-4xl md:text-5xl">
              All Products
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg">
              Each piece in our collection is chosen for its quality, beauty,
              and the story behind its creation.
            </p>
          </div>
        </div>

        {/* Products with Filters */}
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <ModernProductsGrid products={products} />
        </div>
      </div>

      <StorefrontFooter business={business} />
    </div>
  );
}
