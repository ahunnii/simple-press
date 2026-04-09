import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";

export function ElegantCollectionPage({
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
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden bg-secondary/20">
        {collection.imageUrl && (
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover opacity-25"
            priority
            sizes="100vw"
          />
        )}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <Link
            href="/collections"
            className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm tracking-wide transition-colors"
          >
            ← Collections
          </Link>
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
              {collection.description}
            </p>
          )}
          <p className="text-muted-foreground mt-3 text-sm tracking-widest uppercase">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-lg">
              No products in this collection yet.
            </p>
            <Link
              href="/shop"
              className="text-foreground mt-4 inline-block text-sm tracking-wide underline underline-offset-4 hover:opacity-70"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const hasVariants = product.variants.length > 0;
              const displayPrice = hasVariants
                ? (product.variants[0]?.price ?? product.price)
                : product.price;

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="group block"
                >
                  <div className="bg-card overflow-hidden rounded-sm">
                    <div className="bg-muted relative aspect-square overflow-hidden">
                      <Image
                        src={product.images[0]?.url ?? "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-foreground font-serif text-xl font-light">
                        {product.name}
                      </h3>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {formatPrice(displayPrice)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* More collections */}
      {others.length > 0 && (
        <section className="bg-secondary/20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-foreground mb-10 text-center font-serif text-2xl font-light tracking-wide">
              More Collections
            </h2>
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
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-foreground font-serif text-lg font-light tracking-wide">
                        {col.name}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs tracking-widest uppercase">
                        {count} {count === 1 ? "piece" : "pieces"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
