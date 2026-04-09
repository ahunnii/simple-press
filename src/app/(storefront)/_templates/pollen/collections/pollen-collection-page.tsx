import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";

export function PollenCollectionPage({
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
    <div className="bg-white pt-28">
      {/* Hero */}
      {collection.imageUrl ? (
        <div className="relative h-[45vh] min-h-[320px] overflow-hidden">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#2a351f]/50" />
          <div className="absolute inset-0 flex flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <Link
                href="/collections"
                className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                All Collections
              </Link>
              <h1 className="text-4xl font-bold text-white md:text-5xl">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-3 max-w-xl text-white/80">
                  {collection.description}
                </p>
              )}
              <p className="mt-3 text-sm text-white/60">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-[#2a351f]/10 bg-[#f5f2ee] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/collections"
              className="mb-4 inline-flex items-center gap-2 text-sm text-[#4c566a] transition-colors hover:text-[#215935]"
            >
              <ArrowLeft className="h-4 w-4" />
              All Collections
            </Link>
            <h1 className="text-4xl font-bold text-[#2a351f] md:text-5xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-3 max-w-xl text-[#4c566a]">
                {collection.description}
              </p>
            )}
            <p className="mt-3 text-sm text-[#4c566a]">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-[#4c566a]">
              No products in this collection yet.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-block text-sm font-medium text-[#215935] hover:underline"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const hasVariants = product.variants.length > 0;
              const displayPrice = hasVariants
                ? (product.variants[0]?.price ?? product.price)
                : product.price;

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="group block overflow-hidden rounded-md border border-[#2a351f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#f5f2ee]">
                    <Image
                      src={product.images[0]?.url ?? "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-[#2a351f] transition-colors group-hover:text-[#5e7747]">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#215935]">
                      {formatPrice(displayPrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* More collections */}
      {others.length > 0 && (
        <div className="border-t border-[#2a351f]/10 bg-[#f5f2ee] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-bold text-[#2a351f]">
              More Collections
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="group block overflow-hidden rounded-md border border-[#2a351f]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#f5f2ee]">
                      <Image
                        src={col.imageUrl ?? "/placeholder.svg"}
                        alt={col.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-[#2a351f]">
                          {col.name}
                        </h3>
                        <p className="text-sm text-[#4c566a]">
                          {count} {count === 1 ? "product" : "products"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#215935] transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
