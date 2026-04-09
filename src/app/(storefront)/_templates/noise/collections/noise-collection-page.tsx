import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

export function NoiseCollectionPage({
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
    <PageTransition>
      {/* Hero */}
      <section className="relative flex min-h-[55vh] w-full items-end overflow-hidden bg-foreground">
        {collection.imageUrl && (
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/90 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-16 md:px-12 lg:px-20">
          <FadeIn>
            <Link
              href="/collections"
              className="mb-4 inline-block font-sans text-[9px] tracking-[0.3em] uppercase text-background/50 transition-opacity hover:text-background/80"
            >
              ← Collections
            </Link>
            <h1 className="font-serif text-5xl font-light leading-tight text-background md:text-7xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-background/70">
                {collection.description}
              </p>
            )}
            <p className="mt-4 font-sans text-[10px] tracking-[0.3em] uppercase text-background/40">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {products.length === 0 ? (
          <FadeIn>
            <div className="py-20 text-center">
              <p className="font-sans text-muted-foreground">
                No products in this collection yet.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block border border-foreground/20 px-8 py-2 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground transition-all hover:border-foreground hover:bg-foreground hover:text-background"
              >
                Browse All Products
              </Link>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const hasVariants = product.variants.length > 0;
              const displayPrice = hasVariants
                ? (product.variants[0]?.price ?? product.price)
                : product.price;

              return (
                <StaggerItem key={product.id}>
                  <Link href={`/shop/${product.slug}`} className="group block">
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      <Image
                        src={product.images[0]?.url ?? "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-light leading-tight text-foreground transition-opacity group-hover:opacity-70">
                        {product.name}
                      </h3>
                      <span className="shrink-0 font-sans text-sm font-medium text-foreground">
                        {formatPrice(displayPrice)}
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </section>

      {/* More collections */}
      {others.length > 0 && (
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn className="mb-12">
              <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                Continue Exploring
              </p>
              <h2 className="mt-2 font-serif text-3xl font-light text-foreground">
                More Collections
              </h2>
            </FadeIn>
            <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <StaggerItem key={col.id}>
                    <Link
                      href={`/collections/${col.slug}`}
                      className="group block"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <Image
                          src={col.imageUrl ?? "/placeholder.svg"}
                          alt={col.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-foreground/10 transition-opacity group-hover:bg-foreground/20" />
                      </div>
                      <div className="mt-4">
                        <h3 className="font-serif text-lg font-light text-foreground transition-opacity group-hover:opacity-70">
                          {col.name}
                        </h3>
                        <p className="mt-1 font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                          {count} {count === 1 ? "piece" : "pieces"}
                        </p>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
