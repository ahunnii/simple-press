import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Leaf, Package } from "lucide-react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { Badge } from "~/components/ui/badge";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

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
    <PageTransition>
      <div className="bg-background">
        {/* Hero — mirrors happy-bamboo's back-link / count badge / h1 /
            description stack. The imageUrl-less fallback branch is bamboo's
            own (happy-bamboo always has a placeholder image), kept as-is. */}
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
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 flex flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl">
                <FadeIn>
                  <Link
                    href="/collections"
                    className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    All Collections
                  </Link>
                </FadeIn>

                <FadeIn delay={0.1}>
                  <Badge className="mb-4 w-fit gap-1 bg-white/20 text-white hover:bg-white/30">
                    <Package className="h-3 w-3" aria-hidden="true" />
                    {products.length}{" "}
                    {products.length === 1 ? "Product" : "Products"}
                  </Badge>
                </FadeIn>

                <FadeIn delay={0.15}>
                  <h1 className="font-heading mb-4 max-w-2xl text-4xl font-bold text-white md:text-5xl lg:text-6xl">
                    {collection.name}
                  </h1>
                </FadeIn>

                {collection.description && (
                  <FadeIn delay={0.2}>
                    <p className="max-w-xl text-lg leading-relaxed text-white/90">
                      {collection.description}
                    </p>
                  </FadeIn>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bam-cream-deep)] px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <FadeIn>
                <Link
                  href="/collections"
                  className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  All Collections
                </Link>
                <Badge className="mb-4 w-fit gap-1 bg-[var(--bam-forest)]/10 text-[var(--bam-forest-deep)] hover:bg-[var(--bam-forest)]/10">
                  <Package className="h-3 w-3" aria-hidden="true" />
                  {products.length}{" "}
                  {products.length === 1 ? "Product" : "Products"}
                </Badge>
                <h1 className="font-heading text-foreground text-4xl font-bold md:text-5xl">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-muted-foreground mt-3 max-w-xl">
                    {collection.description}
                  </p>
                )}
              </FadeIn>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          {products.length === 0 ? (
            <FadeIn>
              <div className="py-20 text-center">
                <p className="text-muted-foreground text-lg">
                  No products in this collection yet.
                </p>
                <Link
                  href="/shop"
                  className="mt-4 inline-block text-sm font-medium text-[var(--bam-forest)] hover:underline"
                >
                  Browse all products
                </Link>
              </div>
            </FadeIn>
          ) : (
            <>
              {/* Visible icon + h2 + count row, mirroring happy-bamboo's
                  collection-page section header. This is the accessible
                  h2 itself (made visible rather than sr-only) so the page
                  keeps a correct h1 → h2 → h3 outline while matching
                  happy-bamboo's actual visible composition. */}
              <FadeIn className="mb-12 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf
                    className="text-[var(--bam-forest)] h-5 w-5"
                    aria-hidden="true"
                  />
                  <h2 className="font-heading text-foreground text-2xl font-bold md:text-3xl">
                    Products in This Collection
                  </h2>
                </div>
                <span className="text-muted-foreground text-sm">
                  {products.length} {products.length === 1 ? "item" : "items"}
                </span>
              </FadeIn>

              <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const hasVariants = product.variants.length > 0;
                  const displayPrice = hasVariants
                    ? (product.variants[0]?.price ?? product.price)
                    : product.price;

                  return (
                    <StaggerItem key={product.id}>
                      <Link
                        href={`/shop/${product.slug}`}
                        className="group bg-card block overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-all duration-300 hover:border-[var(--bam-gold)]/30 hover:shadow-md"
                      >
                        <div className="relative aspect-square overflow-hidden bg-[var(--bam-cream-deep)]">
                          <Image
                            src={product.images[0]?.url ?? "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                        <div className="p-5">
                          <h3 className="font-heading text-card-foreground text-lg font-semibold transition-colors group-hover:text-[var(--bam-forest-deep)]">
                            {product.name}
                          </h3>
                          <p className="text-foreground mt-1 text-sm font-medium">
                            {formatPrice(displayPrice)}
                          </p>
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </>
          )}
        </div>

        {/* More collections — mirrors happy-bamboo's overlaid name/count
            caption on the image (no separate content row or arrow icon). */}
        {others.length > 0 && (
          <div className="bg-[var(--bam-cream-deep)] py-16 md:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <FadeIn className="mb-8">
                <h2 className="font-heading text-foreground text-2xl font-bold md:text-3xl">
                  Explore Other Collections
                </h2>
              </FadeIn>

              <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((col) => {
                  const count = col._count.collectionProducts;
                  return (
                    <StaggerItem key={col.id}>
                      <Link
                        href={`/collections/${col.slug}`}
                        className="group bg-card relative block overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={col.imageUrl ?? "/placeholder.svg"}
                            alt={col.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute right-0 bottom-0 left-0 p-5">
                            <h3 className="mb-1 text-lg font-bold text-white">
                              {col.name}
                            </h3>
                            <p className="text-sm text-white/80">
                              {count} {count === 1 ? "Product" : "Products"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
