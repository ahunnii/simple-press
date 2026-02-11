import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { ProductDetails } from "../../products/_components/product-details";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export async function DefaultProductPage({ business, product }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <ProductDetails
            product={
              product as unknown as {
                id: string;
                name: string;
                description: string | null;
                price: number;
                images: Array<{ url: string; altText: string | null }>;
                variants: Array<{
                  id: string;
                  name: string;
                  price: number | null;
                  inventoryQty: number;
                  options: Record<string, string>;
                }>;
              }
            }
            business={business}
          />
        </div>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
