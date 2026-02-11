import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";

export function ModernAboutPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <div className="font-sans antialiased">
      <StorefrontHeader business={business} />
      <div className="bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative h-[50vh] min-h-[400px]">
            <Image
              src="/images/about.jpg"
              alt="Haven design studio with artisans at work"
              fill
              className="object-cover"
              priority
            />
            <div className="bg-foreground/40 absolute inset-0" />
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
                <div className="max-w-xl">
                  <p className="text-background/70 text-xs font-semibold tracking-widest uppercase">
                    Our Story
                  </p>
                  <h1 className="text-background mt-2 font-serif text-4xl text-balance md:text-6xl">
                    Made with intention
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-background py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-foreground font-serif text-3xl text-balance md:text-4xl">
                We believe your home should tell your story
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed">
                Haven was founded on a simple idea: that the objects we surround
                ourselves with should be beautiful, functional, and made with
                care. We partner directly with artisans and small makers from
                around the world, bringing you pieces that are as meaningful as
                they are well-made.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-secondary py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                What We Stand For
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
                Our Values
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-accent font-serif text-lg">01</span>
                </div>
                <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                  Quality First
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  Every product is selected for its material quality,
                  craftsmanship, and durability. We believe in buying less but
                  buying better.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-accent font-serif text-lg">02</span>
                </div>
                <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                  Sustainably Sourced
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  We prioritize natural, renewable, and recycled materials. Our
                  packaging is plastic-free and our shipping is carbon-neutral.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-accent font-serif text-lg">03</span>
                </div>
                <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                  Artisan Partnerships
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  We work directly with makers, ensuring fair wages and
                  preserving traditional techniques that might otherwise be
                  lost.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team / Story Section */}
        <section className="bg-background py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                <Image
                  src="/images/collection.jpg"
                  alt="Haven curated home goods collection"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  How It Started
                </p>
                <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                  From a small studio to your home
                </h2>
                <p className="text-muted-foreground mt-6 leading-relaxed">
                  What began as a personal search for well-made, honest home
                  goods turned into Haven. After years of working in interior
                  design, our founder grew frustrated with the gap between mass
                  production and unreachable luxury.
                </p>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  Haven bridges that gap. We travel to workshops, visit studios,
                  and build lasting relationships with the people who make our
                  products. The result is a collection that feels personal,
                  because it is.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section className="border-border bg-background border-y">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <p className="text-foreground font-serif text-4xl">50+</p>
                <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-widest uppercase">
                  Artisan Partners
                </p>
              </div>
              <div className="text-center">
                <p className="text-foreground font-serif text-4xl">12</p>
                <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-widest uppercase">
                  Countries
                </p>
              </div>
              <div className="text-center">
                <p className="text-foreground font-serif text-4xl">100%</p>
                <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-widest uppercase">
                  Plastic Free
                </p>
              </div>
              <div className="text-center">
                <p className="text-foreground font-serif text-4xl">10k+</p>
                <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-widest uppercase">
                  Happy Homes
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-20">
          <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
            <h2 className="text-primary-foreground font-serif text-3xl md:text-4xl">
              Ready to transform your space?
            </h2>
            <p className="text-primary-foreground/70 mx-auto mt-4 max-w-md text-sm">
              Explore our collection of thoughtfully designed home goods and
              find pieces that speak to you.
            </p>
            <Link
              href="/products"
              className="bg-primary-foreground text-primary mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
      <StorefrontFooter business={business} />
    </div>
  );
}
