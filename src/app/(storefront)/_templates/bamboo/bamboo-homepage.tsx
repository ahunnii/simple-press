import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { FadeIn, PageTransition, ScaleIn } from "./bamboo-animations";
import { BambooFeaturedProducts } from "./bamboo-featured-products";
import { BambooSustainabilityBanner } from "./bamboo-sustainability-banner";
import { BambooTestimonials } from "./bamboo-testimonials";

const DEFAULT_LOCATION_ADDRESS = "18058, Detroit, MI 48234";

export async function BambooHomepage() {
  const homepage = await api.business.getHomepage();

  const themeSpecificFields = homepage?.siteContent?.customFields as Record<
    string,
    string
  >;

  const businessAddress =
    themeSpecificFields?.["bamboo.global.location-address"] ??
    DEFAULT_LOCATION_ADDRESS;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress)}`;

  return (
    <HydrateClient>
      {" "}
      <PageTransition>
        {/* Hero Section */}
        <section className="bg-secondary relative overflow-hidden">
          <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
            <FadeIn
              direction="right"
              className="flex flex-1 flex-col items-start gap-6"
            >
              <span className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
                {themeSpecificFields?.["bamboo.homepage.hero-title"] ??
                  "Elevate Your Everyday"}
              </span>
              <h1 className="text-foreground font-serif text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
                <span className="text-balance">
                  {themeSpecificFields?.["bamboo.homepage.hero-title"] ??
                    "Elevate Your Everyday"}
                </span>
              </h1>
              <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
                {themeSpecificFields?.["bamboo.homepage.hero-description"] ??
                  "Luxuriously soft, tree-free bamboo paper products crafted in Detroit. Because what you bring into your home should be as thoughtful as the life you build in it."}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link
                    href={
                      themeSpecificFields?.[
                        "bamboo.homepage.hero-primary-button-link"
                      ] ?? "/shop"
                    }
                  >
                    {themeSpecificFields?.[
                      "bamboo.homepage.hero-primary-button-text"
                    ] ?? "Shop Now"}{" "}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link
                    href={
                      themeSpecificFields?.[
                        "bamboo.homepage.hero-secondary-button-link"
                      ] ?? "/about"
                    }
                  >
                    {themeSpecificFields?.[
                      "bamboo.homepage.hero-secondary-button-text"
                    ] ?? "Our Story"}
                  </Link>
                </Button>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={0.15} className="relative flex-1">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
                <Image
                  src={
                    themeSpecificFields?.["bamboo.homepage.hero-image"] ??
                    "/placeholder.svg"
                  }
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
                <span className="text-balance">
                  {themeSpecificFields?.["bamboo.homepage.featured-title"] ??
                    "Our Curated Collection"}
                </span>
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
                {themeSpecificFields?.[
                  "bamboo.homepage.featured-description"
                ] ??
                  "Every product is 100% bamboo, tree-free, and crafted to the highest standard. No compromises."}
              </p>
            </div>
          </FadeIn>
          <BambooFeaturedProducts featuredProducts={homepage?.products ?? []} />
          <FadeIn direction="up" delay={0.3}>
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">
                  {themeSpecificFields?.[
                    "bamboo.homepage.featured-button-text"
                  ] ?? "View All Products"}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </section>

        {/* Sustainability Banner */}
        <BambooSustainabilityBanner fields={themeSpecificFields} />

        {/* About Teaser */}
        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <ScaleIn>
            <div className="bg-secondary flex flex-col items-center gap-6 rounded-2xl p-8 text-center md:p-16">
              <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">
                  {themeSpecificFields?.[
                    "bamboo.homepage.about-teaser-heading"
                  ] ?? "From Detroit, With Purpose"}
                </span>
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                {themeSpecificFields?.["bamboo.homepage.about-teaser-body"] ??
                  "We started Finally Results LLC with a simple belief: the everyday products in your home should be better -- better for your family, and better for the planet. Our roots in Detroit drive everything we do."}
              </p>
              <Button variant="outline" asChild>
                <Link href="/about">
                  {themeSpecificFields?.[
                    "bamboo.homepage.about-teaser-button-text"
                  ] ?? "Learn More"}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </ScaleIn>
        </section>

        {/* Location */}
        <section className="bg-secondary/50 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn direction="up">
              <div className="mb-12 text-center">
                <h2 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
                  <span className="text-balance">
                    {themeSpecificFields?.[
                      "bamboo.homepage.location-heading"
                    ] ?? "Our Location"}
                  </span>
                </h2>
              </div>
            </FadeIn>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-slate-100"
            >
              {/* The image fills the parent */}
              <img
                src={
                  themeSpecificFields?.["bamboo.global.location-map"] ??
                  "/placeholder.svg"
                }
                alt="Map"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Overlay appears only on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex flex-col items-center justify-center">
                  <MapPin className="h-12 w-12 text-white" />
                  <p className="text-lg font-medium text-white drop-shadow">
                    Click to view on Google Maps
                  </p>
                </div>
              </div>
            </a>
            {/* <BambooTestimonials fields={themeSpecificFields} /> */}
          </div>
        </section>
      </PageTransition>
    </HydrateClient>
  );
}
