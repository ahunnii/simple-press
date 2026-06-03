import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Package } from "lucide-react";

import type { Product } from "~/types";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { DEFAULT_BAMBOO_FEATURES } from ".";
import { resolveFields } from "..";
import { BambooProductCard } from "../shared/bamboo-product-card";

export async function BambooHomepage() {
  const homepage = await api.business.getHomepage();

  const address = homepage?.businessAddress;

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "bamboo.global.location-map",
    "bamboo.homepage.hero-background",
    "bamboo.homepage.hero-image",
    "bamboo.homepage.hero-title",
    "bamboo.homepage.hero-tagline",
    "bamboo.homepage.hero-description",
    "bamboo.homepage.hero-primary-button-link",
    "bamboo.homepage.hero-primary-button-text",
    "bamboo.homepage.hero-secondary-button-link",
    "bamboo.homepage.hero-secondary-button-text",
    "bamboo.homepage.featured-title",
    "bamboo.homepage.featured-description",
    "bamboo.homepage.featured-button-text",
    "bamboo.homepage.about-teaser-heading",
    "bamboo.homepage.about-teaser-body",
    "bamboo.homepage.about-teaser-button-text",
    "bamboo.homepage.about-teaser-button-link",
    "bamboo.homepage.location-heading",
  ]);

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  const heroBackground = f["bamboo.homepage.hero-background"];

  const sustainabilityList = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "bamboo.homepage.sustainability-list",
    ),
    DEFAULT_BAMBOO_FEATURES,
  );

  return (
    <HydrateClient>
      <PageTransition>
        {/* Hero Section */}
        <section
          {...sectionGroupAttr("homepage", "hero")}
          className={cn(
            "relative overflow-hidden",
            heroBackground ? "" : "bg-secondary",
          )}
          style={
            heroBackground
              ? {
                  backgroundImage: `url('${heroBackground}')`,
                  backgroundSize: "600px",
                  backgroundRepeat: "repeat",
                }
              : undefined
          }
        >
          {!!heroBackground && (
            <div
              className="bg-background/40 absolute inset-0"
              aria-hidden="true"
            />
          )}
          <div className="relative mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
            <FadeIn
              direction="right"
              className="flex flex-1 flex-col items-start gap-6"
            >
              <span className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
                {f["bamboo.homepage.hero-tagline"]}
              </span>
              <h1 className="text-foreground font-heading text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
                <span className="text-balance">
                  {f["bamboo.homepage.hero-title"]}
                </span>
              </h1>
              <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
                {f["bamboo.homepage.hero-description"]}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link href={f["bamboo.homepage.hero-primary-button-link"]!}>
                    {f["bamboo.homepage.hero-primary-button-text"]}{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href={f["bamboo.homepage.hero-secondary-button-link"]!}>
                    {f["bamboo.homepage.hero-secondary-button-text"]}
                  </Link>
                </Button>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={0.15} className="relative flex-1">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
                <Image
                  src={f["bamboo.homepage.hero-image"]!}
                  alt=""
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
        <section
          {...sectionGroupAttr("homepage", "featured")}
          className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
        >
          <FadeIn direction="up">
            <div className="mb-12 text-center">
              <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">
                  {f["bamboo.homepage.featured-title"]}
                </span>
              </h2>
              <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
                {f["bamboo.homepage.featured-description"]}
              </p>
            </div>
          </FadeIn>
          <StaggerContainer
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.12}
          >
            {homepage?.products?.slice(0, 3)?.map((product, index) => (
              <StaggerItem key={product.id}>
                <BambooProductCard
                  key={product.id}
                  index={index}
                  product={product as Product}
                />
              </StaggerItem>
            ))}
            {homepage?.products?.length === 0 && (
              <StaggerItem key="no-products">
                <div className="flex flex-col items-center justify-center">
                  <Package className="text-muted-foreground/50 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-lg">
                    No products found
                  </p>
                </div>
              </StaggerItem>
            )}
          </StaggerContainer>
          <FadeIn direction="up" delay={0.3}>
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">
                  View All Products
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </section>

        {/* Sustainability Banner */}
        <section
          {...sectionGroupAttr("homepage", "sustainability")}
          className="bg-primary"
        >
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
            <StaggerContainer
              className="grid grid-cols-2 gap-8 lg:grid-cols-3"
              staggerDelay={0.1}
            >
              {sustainabilityList?.map((feature) => (
                <StaggerItem
                  key={feature.title}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div
                    className="bg-primary-foreground/10 flex size-12 items-center justify-center rounded-full"
                    aria-hidden="true"
                  >
                    <feature.icon className="text-primary-foreground size-6" />
                  </div>
                  <h3 className="text-primary-foreground text-sm font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-primary-foreground/80 text-xs">
                    {feature.description}
                  </p>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* About Teaser */}
        <section
          {...sectionGroupAttr("homepage", "aboutTeaser")}
          className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
        >
          <ScaleIn>
            <div className="bg-secondary flex flex-col items-center gap-6 rounded-2xl p-8 text-center md:p-16">
              <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">
                  {f["bamboo.homepage.about-teaser-heading"]}
                </span>
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                {f["bamboo.homepage.about-teaser-body"]}
              </p>
              <Button variant="outline" asChild>
                <Link href={f["bamboo.homepage.about-teaser-button-link"]!}>
                  {f["bamboo.homepage.about-teaser-button-text"]}{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </ScaleIn>
        </section>

        {/* Location */}
        <section
          {...sectionGroupAttr("homepage", "location")}
          className="bg-secondary/50 py-20"
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn direction="up">
              <div className="mb-12 text-center">
                <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                  <span className="text-balance">
                    {f["bamboo.homepage.location-heading"]}
                  </span>
                </h2>
              </div>
            </FadeIn>

            <a
              href={mapsUrl ?? "#!"}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View our location on Google Maps (opens in new tab)"
              className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f["bamboo.global.location-map"]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <div className="flex flex-col items-center justify-center">
                  <MapPin className="h-12 w-12 text-white" />
                  <p className="text-lg font-medium text-white drop-shadow">
                    View on Google Maps
                  </p>
                </div>
              </div>
            </a>
          </div>
        </section>
      </PageTransition>
    </HydrateClient>
  );
}
