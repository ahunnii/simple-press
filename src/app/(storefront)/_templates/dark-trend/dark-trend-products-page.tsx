import type { RouterOutputs } from "~/trpc/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

import { DarkTrendProductCard } from "./dark-trend-product-card";

// #1A1A1A

export function DarkTrendProductsPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["getWithProducts"]>;
}) {
  return (
    <main className="flex-1 bg-[#1A1A1A] px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mt-10 mb-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-purple-500">
                  Shop
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            All Products
          </h1>
          <p className="text-center text-gray-600">
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {business.products?.map((product, index) => (
              <DarkTrendProductCard
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
                  image: product.images[0]?.url ?? "",
                  badge: null,
                  category: "",
                  slug: product.slug ?? "",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
