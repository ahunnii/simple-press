import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";

import { ModernCollectionFilterClient } from "./modern-collection-filter-client";

export function ModernCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null) as Product[];

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <div className="bg-background">
      {/* Hero */}
      {collection.imageUrl ? (
        <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="bg-foreground/40 absolute inset-0" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-12 lg:px-8">
              <Link
                href="/collections"
                className="text-background/70 hover:text-background mb-4 inline-block text-sm transition-colors"
              >
                ← Collections
              </Link>
              <h1 className="text-background font-serif text-4xl md:text-5xl">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-background/80 mt-3 max-w-xl">
                  {collection.description}
                </p>
              )}
              <p className="text-background/60 mt-3 text-sm tracking-wide uppercase">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-border border-b">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <Link
              href="/collections"
              className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm transition-colors"
            >
              ← Collections
            </Link>
            <h1 className="text-foreground font-serif text-4xl md:text-5xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground mt-3 max-w-xl">
                {collection.description}
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs tracking-wide uppercase">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-lg">
              No products in this collection yet.
            </p>
            <Link
              href="/shop"
              className="text-foreground mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <ModernCollectionFilterClient products={products} />
        )}
      </div>

      {/* More collections */}
      {others.length > 0 && (
        <div className="border-border border-t py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <p className="text-muted-foreground mb-8 text-xs font-semibold tracking-widest uppercase">
              More Collections
            </p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-4/3 overflow-hidden rounded-sm">
                      <Image
                        src={col.imageUrl ?? "/placeholder.svg"}
                        alt={col.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="mt-4">
                      <h3 className="text-foreground font-serif text-lg">
                        {col.name}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
                        {count} {count === 1 ? "product" : "products"}
                      </p>
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
