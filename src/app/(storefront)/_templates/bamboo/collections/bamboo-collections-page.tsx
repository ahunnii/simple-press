import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Sparkles } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";

export function BambooCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.collections.listing-title",
    "bamboo.collections.listing-intro",
  ]);
  return (
    <PageTransition>
      <div className="bg-background">
        {/* Header */}
        <FadeIn
          {...sectionGroupAttr("collections", "listing")}
          className="bg-[var(--bam-cream-deep)] px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8"
        >
          <p className="font-sans text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase">
            Collections
          </p>
          <h1
            className="font-serif text-foreground mt-3 text-4xl font-bold md:text-5xl"
            {...fieldAttr("bamboo.collections.listing-title")}
          >
            {f["bamboo.collections.listing-title"]}
          </h1>
          <p
            className="text-muted-foreground mx-auto mt-4 max-w-lg text-base"
            {...fieldAttr("bamboo.collections.listing-intro")}
          >
            {f["bamboo.collections.listing-intro"]}
          </p>
        </FadeIn>

        {/* All Collections — mirrors happy-bamboo's icon + h2 section header
            above the grid, so card titles below can be h3s (correct h1 → h2
            → h3 outline) instead of sitting directly under the page h1. */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-2">
              <Sparkles
                className="text-[var(--bam-forest)] h-5 w-5"
                aria-hidden="true"
              />
              <h2 className="font-heading text-foreground text-2xl font-bold md:text-3xl">
                All Collections
              </h2>
            </div>
          </FadeIn>

          {list.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package
                  className="text-muted-foreground/50 mb-4 h-12 w-12"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground text-lg">
                  No collections available at this time.
                </p>
                <Button asChild className="mt-6 rounded-full">
                  <Link href="/shop">Browse All Products</Link>
                </Button>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((collection) => {
                const count = collection._count.collectionProducts;
                return (
                  <StaggerItem key={collection.id}>
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="group block h-full"
                    >
                      <article className="bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--bam-gold)]/30 hover:shadow-xl">
                        <div className="relative aspect-4/3 overflow-hidden">
                          <Image
                            src={collection.imageUrl ?? "/placeholder.svg"}
                            alt={collection.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          <div className="absolute right-4 bottom-4 left-4">
                            <Badge className="bg-[var(--bam-cream)]/90 text-[var(--bam-forest-deep)] hover:bg-[var(--bam-cream)]">
                              {count} {count === 1 ? "Product" : "Products"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-6">
                          <h3 className="font-heading text-card-foreground mb-2 text-xl font-bold transition-colors group-hover:text-[var(--bam-forest-deep)]">
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p className="text-muted-foreground mb-4 flex-1 line-clamp-2 text-sm leading-relaxed">
                              {collection.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--bam-forest)]">
                            Explore Collection
                            <ArrowRight
                              className="h-4 w-4 transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </article>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
