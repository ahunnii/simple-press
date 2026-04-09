import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";

export function BambooCollectionPage({
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
    <div className="bg-background">
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
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <Link
                href="/collections"
                className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                All Collections
              </Link>
              <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">
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
        <div className="bg-secondary/30 border-border border-b px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/collections"
              className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Collections
            </Link>
            <h1 className="font-heading text-foreground text-4xl font-bold md:text-5xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground mt-3 max-w-xl">
                {collection.description}
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-sm">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-lg">
              No products in this collection yet.
            </p>
            <Link
              href="/shop"
              className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
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
                  className="group border-border bg-card block overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="bg-secondary relative aspect-square overflow-hidden">
                    <Image
                      src={product.images[0]?.url ?? "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-card-foreground group-hover:text-primary text-lg font-semibold transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
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
        <div className="border-border border-t bg-secondary/20 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-foreground mb-8 text-2xl font-bold">
              More Collections
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="group border-border bg-card block overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-video overflow-hidden">
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
                        <h3 className="font-heading text-card-foreground font-semibold">
                          {col.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {count} {count === 1 ? "product" : "products"}
                        </p>
                      </div>
                      <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
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
