import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Quote, Star } from "lucide-react";

import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { DEFAULT_BAMBOO_FEATURES } from ".";
import { resolveFields } from "..";
import { BambooMap } from "../shared/bamboo-map";
import { BambooProductCard } from "../shared/bamboo-product-card";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export async function BambooHomepage() {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 3 })
    : [];

  const address = homepage?.businessAddress;

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "bamboo.global.map-lat",
    "bamboo.global.map-lng",
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
    "bamboo.homepage.testimonials-heading",
  ]);

  const latRaw = f["bamboo.global.map-lat"]?.trim();
  const lngRaw = f["bamboo.global.map-lng"]?.trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;
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
              <span
                className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase"
                {...fieldAttr("bamboo.homepage.hero-tagline")}
              >
                {f["bamboo.homepage.hero-tagline"]}
              </span>
              <h1 className="text-foreground font-heading text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.homepage.hero-title")}
                >
                  {f["bamboo.homepage.hero-title"]}
                </span>
              </h1>
              <p
                className="text-muted-foreground max-w-md text-lg leading-relaxed"
                {...fieldAttr("bamboo.homepage.hero-description")}
              >
                {f["bamboo.homepage.hero-description"]}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link href={f["bamboo.homepage.hero-primary-button-link"]!}>
                    <span
                      {...fieldAttr("bamboo.homepage.hero-primary-button-text")}
                    >
                      {f["bamboo.homepage.hero-primary-button-text"]}
                    </span>{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link
                    href={f["bamboo.homepage.hero-secondary-button-link"]!}
                    {...fieldAttr(
                      "bamboo.homepage.hero-secondary-button-text",
                    )}
                  >
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
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.homepage.featured-title")}
                >
                  {f["bamboo.homepage.featured-title"]}
                </span>
              </h2>
              <p
                className="text-muted-foreground mx-auto mt-4 max-w-2xl"
                {...fieldAttr("bamboo.homepage.featured-description")}
              >
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
                  <Package
                    className="text-muted-foreground/50 mb-4 h-12 w-12"
                    aria-hidden="true"
                  />
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
        {isSectionVisible(
          homepage?.siteContent?.customFields,
          "bamboo",
          "homepage.sustainability",
        ) && (
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
        )}

        {/* About Teaser */}
        <section
          {...sectionGroupAttr("homepage", "aboutTeaser")}
          className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
        >
          <ScaleIn>
            <div className="bg-secondary flex flex-col items-center gap-6 rounded-2xl p-8 text-center md:p-16">
              <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.homepage.about-teaser-heading")}
                >
                  {f["bamboo.homepage.about-teaser-heading"]}
                </span>
              </h2>
              <p
                className="text-muted-foreground max-w-2xl text-lg leading-relaxed"
                {...fieldAttr("bamboo.homepage.about-teaser-body")}
              >
                {f["bamboo.homepage.about-teaser-body"]}
              </p>
              <Button variant="outline" asChild>
                <Link href={f["bamboo.homepage.about-teaser-button-link"]!}>
                  <span
                    {...fieldAttr("bamboo.homepage.about-teaser-button-text")}
                  >
                    {f["bamboo.homepage.about-teaser-button-text"]}
                  </span>{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </ScaleIn>
        </section>

        {/* Testimonials */}
        {testimonials.length > 0 &&
          isSectionVisible(
            homepage?.siteContent?.customFields,
            "bamboo",
            "homepage.testimonials",
          ) && (
            <section
              {...sectionGroupAttr("homepage", "testimonials")}
              className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
            >
              <FadeIn direction="up">
                <div className="mb-12 text-center">
                  <span className="text-primary text-sm font-semibold tracking-wider uppercase">
                    Testimonials
                  </span>
                  <h2 className="text-foreground font-heading mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                    <span
                      className="text-balance"
                      {...fieldAttr("bamboo.homepage.testimonials-heading")}
                    >
                      {f["bamboo.homepage.testimonials-heading"]}
                    </span>
                  </h2>
                </div>
              </FadeIn>
              <StaggerContainer
                staggerDelay={0.12}
                className="grid gap-8 md:grid-cols-3"
              >
                {testimonials.map((t) => (
                  <StaggerItem key={t.id}>
                    <Card className="border-border/60 bg-card h-full">
                      <CardContent className="flex h-full flex-col p-8">
                        <div
                          className="flex gap-0.5"
                          role="img"
                          aria-label="5 out of 5 stars"
                        >
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="fill-accent text-accent size-4"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <Quote
                          className="text-primary/30 mt-4 mb-3 h-8 w-8"
                          aria-hidden="true"
                        />
                        <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                          &ldquo;{t.text}&rdquo;
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {getInitials(t.customerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-heading text-foreground text-sm font-semibold">
                              {t.customerName}
                            </p>
                            {[t.customerTitle, t.customerCompany].filter(
                              Boolean,
                            ).length > 0 ? (
                              <p className="text-muted-foreground text-xs">
                                {[t.customerTitle, t.customerCompany]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              <FadeIn direction="up" delay={0.3}>
                <div className="mt-12 text-center">
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/testimonials">
                      Read All Testimonials
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </section>
          )}

        {/* Location */}
        {hasCoords &&
          isSectionVisible(
            homepage?.siteContent?.customFields,
            "bamboo",
            "homepage.location",
          ) && (
            <section
              {...sectionGroupAttr("homepage", "location")}
              className="bg-secondary/50 py-20"
            >
              <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <FadeIn direction="up">
                  <div className="mb-12 text-center">
                    <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                      <span
                        className="text-balance"
                        {...fieldAttr("bamboo.homepage.location-heading")}
                      >
                        {f["bamboo.homepage.location-heading"]}
                      </span>
                    </h2>
                  </div>
                </FadeIn>

                <ScaleIn>
                  <BambooMap
                    businessName={homepage?.name ?? ""}
                    address={address ?? undefined}
                    latitude={lat}
                    longitude={lng}
                    viewUrl={viewUrl}
                    directionsUrl={directionsUrl}
                  />
                </ScaleIn>
              </div>
            </section>
          )}
      </PageTransition>
    </HydrateClient>
  );
}
