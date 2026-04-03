import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../types";

import { DefaultProductCard } from "./default-product-card";

export function DefaultCollectionPage({
  business,
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <main className="flex-1">
      <div className="border-b bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span>/</span>
            <Link href="/collections" className="hover:text-primary">
              Collections
            </Link>
            <span>/</span>
            <span className="text-gray-600">{collection.name}</span>
          </div>

          <Link
            href="/collections"
            className="mb-6 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to collections
          </Link>

          {collection.imageUrl ? (
            <div className="relative mb-6 aspect-21/9 w-full overflow-hidden rounded-lg bg-gray-100 sm:aspect-3/1">
              <Image
                src={collection.imageUrl}
                alt={collection.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          ) : null}

          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            {collection.name}
          </h1>

          {collection.description ? (
            <p className="max-w-3xl text-lg text-gray-600">
              {collection.description}
            </p>
          ) : null}

          <p className="mt-4 text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          Products in this collection
        </h2>

        {products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No products in this collection yet.</p>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-medium hover:underline"
            >
              View all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collection.collectionProducts.map((cp) => {
              const product = cp.product;
              if (!product) return null;

              const hasVariants = product.variants.length > 0;
              const displayPrice = hasVariants
                ? (product.variants[0]?.price ?? product.price)
                : product.price;

              return (
                <DefaultProductCard
                  key={cp.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug ?? "",
                    price: displayPrice,
                    images: product.images,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {others.length > 0 ? (
        <div className="border-t border-gray-100 bg-gray-50/80 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              More collections
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                      <Image
                        src={col.imageUrl ?? "/placeholder.svg"}
                        alt={col.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="mb-1 text-lg font-semibold text-gray-900">
                        {col.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {count} product{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
