"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../types";
import type { RouterOutputs } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "./happy-bamboo-animations";

export function HappyBambooCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Leaf className="mr-1 h-3 w-3" />
              Shop by Collection
            </Badge>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Our Collections
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Explore our curated collections of premium bamboo products. Find
              the perfect match for your sustainable lifestyle.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              <h2 className="text-2xl font-bold md:text-3xl">
                All Collections
              </h2>
            </div>
          </FadeIn>

          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {collections?.map((collection) => {
              const productCount = collection?._count.collectionProducts;
              return (
                <StaggerItem key={collection.id}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group block h-full"
                  >
                    <article className="border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                      {/* Image */}
                      <div className="relative aspect-4/3 overflow-hidden">
                        <Image
                          src={collection?.imageUrl ?? "/placeholder.svg"}
                          alt={collection.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute right-4 bottom-4 left-4">
                          <Badge className="text-foreground bg-white/90 hover:bg-white">
                            {productCount}{" "}
                            {productCount === 1 ? "Product" : "Products"}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="group-hover:text-primary mb-2 text-xl font-bold transition-colors">
                          {collection.name}
                        </h3>
                        <p className="text-muted-foreground mb-4 flex-1 text-sm leading-relaxed">
                          {collection.description}
                        </p>
                        <div className="text-primary flex items-center gap-2 text-sm font-semibold">
                          Explore Collection
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                Can&apos;t Decide?
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Browse our full catalog to discover all of our premium bamboo
                products, or start with our bestselling trial pack.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/shop">
                    View All Products
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
