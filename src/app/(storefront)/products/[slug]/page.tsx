import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ProductDetails } from "../_components/product-details";
import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Find business
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  // Find product
  const product = await api.product.get(slug);

  if (!product) {
    notFound();
  }

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
