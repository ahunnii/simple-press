import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "~/components/ui/button";

import { FadeIn, PageTransition, ScaleIn } from "./bamboo-animations";
import { BambooFeaturedProducts } from "./bamboo-featured-products";
import { BambooSustainabilityBanner } from "./bamboo-sustainability-banner";
import { BambooTestimonials } from "./bamboo-testimonials";

export function BambooHomepage() {
  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="bg-secondary relative overflow-hidden">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
          <FadeIn
            direction="right"
            className="flex flex-1 flex-col items-start gap-6"
          >
            <span className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
              Premium Bamboo Products
            </span>
            <h1 className="text-foreground font-serif text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
              <span className="text-balance">Elevate Your Everyday</span>
            </h1>
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              Luxuriously soft, tree-free bamboo paper products crafted in
              Detroit. Because what you bring into your home should be as
              thoughtful as the life you build in it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/shop">
                  Shop Now <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">Our Story</Link>
              </Button>
            </div>
          </FadeIn>
          <FadeIn direction="left" delay={0.15} className="relative flex-1">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
              <Image
                src="/placeholder.svg"
                alt="Hero Image"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="mb-12 text-center">
            <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">Our Curated Collection</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              Every product is 100% bamboo, tree-free, and crafted to the
              highest standard. No compromises.
            </p>
          </div>
        </FadeIn>
        <BambooFeaturedProducts />
        <FadeIn direction="up" delay={0.3}>
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/shop">
                View All Products <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* Sustainability Banner */}
      <BambooSustainabilityBanner />

      {/* About Teaser */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <ScaleIn>
          <div className="bg-secondary flex flex-col items-center gap-6 rounded-2xl p-8 text-center md:p-16">
            <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">From Detroit, With Purpose</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
              We started Finally Results LLC with a simple belief: the everyday
              products in your home should be better -- better for your family,
              and better for the planet. Our roots in Detroit drive everything
              we do.
            </p>
            <Button variant="outline" asChild>
              <Link href="/about">
                Learn More <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </ScaleIn>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <div className="mb-12 text-center">
              <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">What Our Customers Say</span>
              </h2>
            </div>
          </FadeIn>
          <BambooTestimonials />
        </div>
      </section>
    </PageTransition>
  );
}
