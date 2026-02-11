import { notFound } from "next/navigation";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/server";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { DefaultProductCard } from "./default-product-card";

export function DefaultProductsPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">
              All Products
            </h1>
            <p className="text-gray-600">
              {business.products?.length} product
              {business.products?.length !== 1 ? "s" : ""}
            </p>
          </div>

          {business.products?.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-gray-500">
                No products available at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {business.products?.map((product) => (
                <DefaultProductCard
                  key={product.id}
                  product={
                    product as unknown as {
                      id: string;
                      name: string;
                      slug: string;
                      price: number;
                      images: Array<{ url: string; altText: string | null }>;
                    }
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
