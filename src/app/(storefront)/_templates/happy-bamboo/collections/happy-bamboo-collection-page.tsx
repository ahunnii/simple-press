"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Leaf, Package } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { HappyBambooProductCard } from "../shared/happy-bamboo-product-card";

type Props = {
  business: { siteContent?: { customFields?: unknown } | null };
  collection: NonNullable<RouterOutputs["collections"]["getBySlug"]>;
  additionalCollections: NonNullable<
    RouterOutputs["collections"]["getAllPublic"]
  >;
};

export function HappyBambooCollectionPage({
  business,
  collection,
  additionalCollections,
}: Props) {
  const fields = resolveFields(business.siteContent?.customFields, [
    "happy-bamboo.sale-badge-format",
  ]);
  const saleBadgeFormat = fields["happy-bamboo.sale-badge-format"] ?? "true";
  const products = collection?.collectionProducts;
  const otherCollections = additionalCollections
    ?.filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <PageTransition>
      {/* Hero Section with Collection Image */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-col items-center justify-center gap-12 md:flex-row">
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Link
                href="/collections"
                className="text-muted-foreground hover:text-primary mb-6 inline-flex w-fit items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Collections
              </Link>

              <Badge className="mb-4 w-fit">
                <Package aria-hidden className="mr-1 h-3 w-3" />
                {products.length}{" "}
                {products.length === 1 ? "Product" : "Products"}
              </Badge>

              <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
                {collection.name}
              </h1>

              {!!collection.description && (
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {collection.description}
                </p>
              )}
            </FadeIn>

            {!!collection.imageUrl && (
              <FadeIn
                direction="right"
                className="flex w-full flex-1 items-center justify-center"
              >
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-md">
                  <Image
                    src={collection.imageUrl}
                    alt={collection.name}
                    fill
                    priority
                    sizes="(min-width: 768px) 448px, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="text-primary h-5 w-5" />
                <h2 className="font-serif text-2xl font-bold md:text-3xl">
                  Products in This Collection
                </h2>
              </div>
              <span className="text-muted-foreground text-sm">
                {products.length} {products.length === 1 ? "item" : "items"}
              </span>
            </div>
          </FadeIn>

          {products.length > 0 ? (
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <StaggerItem key={product.id}>
                  <HappyBambooProductCard
                    saleBadgeFormat={saleBadgeFormat}
                    product={
                      {
                        ...product.product,
                      } as Product
                    }
                    index={index}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="text-muted-foreground/50 mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-lg">
                  No products in this collection yet.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/shop">Browse All Products</Link>
                </Button>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      <Separator className="container mx-auto" />

      {/* Other Collections */}
      {otherCollections.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <FadeIn className="mb-12">
              <h2 className="font-serif text-2xl font-bold md:text-3xl">
                Explore Other Collections
              </h2>
            </FadeIn>

            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherCollections.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <StaggerItem key={col.id}>
                    <Link
                      href={`/collections/${col.slug}`}
                      className="group block"
                    >
                      <article className="border-border bg-card relative overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={col.imageUrl ?? "/placeholder.svg"}
                            alt={col.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                      </article>
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
