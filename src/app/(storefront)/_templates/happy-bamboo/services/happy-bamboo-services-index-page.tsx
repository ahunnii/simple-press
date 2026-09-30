"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Package, Sparkles } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "happy-bamboo.services.hero-small-label",
  "happy-bamboo.services.hero-heading",
  "happy-bamboo.services.hero-intro",
  "happy-bamboo.services.hero-image",
  "happy-bamboo.services.list-heading",
  "happy-bamboo.services.card-link-text",
  "happy-bamboo.services.empty-heading",
  "happy-bamboo.services.empty-body",
  "happy-bamboo.services.empty-button-text",
  "happy-bamboo.services.cta-heading",
  "happy-bamboo.services.cta-body",
  "happy-bamboo.services.cta-button-text",
  "happy-bamboo.services.cta-button-link",
];

/**
 * `/services` — the happy-bamboo services index. Mirrors the collections
 * listing page's visual language: a page-shelf header (see
 * `contact/happy-bamboo-contact-page.tsx`), a card grid cloned from
 * `collections/happy-bamboo-collections-page.tsx`, and a matching closing
 * banner.
 */
export function HappyBambooServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const smallLabel = f["happy-bamboo.services.hero-small-label"] ?? "";
  const heading = f["happy-bamboo.services.hero-heading"] ?? "";
  const intro = f["happy-bamboo.services.hero-intro"] ?? "";
  const heroImage = f["happy-bamboo.services.hero-image"] ?? "";
  const hasHeroImage = heroImage.trim().length > 0;

  const listHeading = f["happy-bamboo.services.list-heading"] ?? "";
  const cardLinkText = f["happy-bamboo.services.card-link-text"] ?? "";
  const emptyHeading = f["happy-bamboo.services.empty-heading"] ?? "";
  const emptyBody = f["happy-bamboo.services.empty-body"] ?? "";
  const emptyButtonText = f["happy-bamboo.services.empty-button-text"] ?? "";

  const ctaHeading = f["happy-bamboo.services.cta-heading"] ?? "";
  const ctaBody = f["happy-bamboo.services.cta-body"] ?? "";
  const ctaButtonText = f["happy-bamboo.services.cta-button-text"] ?? "";
  const ctaButtonLink =
    f["happy-bamboo.services.cta-button-link"] ?? "/contact";

  return (
    <PageTransition>
      {/* Page shelf header */}
      <section
        className="bg-muted/50 py-16 md:py-24"
        {...sectionGroupAttr("services", "hero")}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-col items-center justify-center gap-12 md:flex-row">
            {/* Text content */}
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              {!!smallLabel && (
                <Badge
                  className="mb-4 w-fit"
                  {...fieldAttr("happy-bamboo.services.hero-small-label")}
                >
                  <Leaf className="mr-1 h-3 w-3" />
                  {smallLabel}
                </Badge>
              )}
              <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
                <span
                  className="font-serif"
                  {...fieldAttr("happy-bamboo.services.hero-heading")}
                >
                  {heading}
                </span>
              </h1>
              {intro && (
                <p
                  className="text-muted-foreground text-lg leading-relaxed"
                  {...fieldAttr("happy-bamboo.services.hero-intro")}
                >
                  {intro}
                </p>
              )}
            </FadeIn>
            {/* Aspect-video image on the right — omitted entirely when blank */}
            {hasHeroImage && (
              <FadeIn
                direction="right"
                className="flex w-full flex-1 items-center justify-center"
              >
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl shadow-md">
                  <Image
                    src={heroImage}
                    alt={heading || business.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                  />
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section
        className="py-16 md:py-24"
        {...sectionGroupAttr("services", "list")}
      >
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              <h2
                className="font-serif text-2xl font-bold md:text-3xl"
                {...fieldAttr("happy-bamboo.services.list-heading")}
              >
                {listHeading}
              </h2>
            </div>
          </FadeIn>

          {services.length > 0 ? (
            <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const itemCount = service.items.length;
                return (
                  <StaggerItem key={service.id}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group block h-full"
                    >
                      <article className="border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        {/* Image */}
                        <div className="relative aspect-4/3 overflow-hidden">
                          {service.image ? (
                            <Image
                              src={service.image}
                              alt={service.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[var(--hb-brand)] to-[var(--hb-brand-deep)]">
                              <Leaf className="h-12 w-12 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          {itemCount > 0 && (
                            <div className="absolute right-4 bottom-4 left-4">
                              <Badge className="text-foreground bg-white/90 hover:bg-white">
                                {itemCount}{" "}
                                {itemCount === 1 ? "option" : "options"}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-6">
                          <h3 className="group-hover:text-primary mb-2 text-xl font-bold transition-colors">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm leading-relaxed">
                              {service.description}
                            </p>
                          )}
                          <div className="text-primary flex items-center gap-2 text-sm font-semibold">
                            {cardLinkText}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          ) : (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="text-muted-foreground/50 mb-4 h-12 w-12" />
                {!!emptyHeading && (
                  <p className="text-muted-foreground text-lg">
                    {emptyHeading}
                  </p>
                )}
                {!!emptyBody && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {emptyBody}
                  </p>
                )}
                {!!emptyButtonText && (
                  <Button asChild className="mt-6">
                    <Link href="/contact">{emptyButtonText}</Link>
                  </Button>
                )}
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* Closing banner */}
      {isSectionVisible(customFields, "happy-bamboo", "services.cta") && (
        <section
          className="py-16 md:py-24"
          {...sectionGroupAttr("services", "cta")}
        >
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-4 font-serif text-2xl font-bold md:text-3xl">
                  <span
                    className="font-serif"
                    {...fieldAttr("happy-bamboo.services.cta-heading")}
                  >
                    {ctaHeading}
                  </span>
                </h2>
                {ctaBody && (
                  <p
                    className="text-muted-foreground mb-8 leading-relaxed"
                    {...fieldAttr("happy-bamboo.services.cta-body")}
                  >
                    {ctaBody}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild size="lg">
                    <Link href={ctaButtonLink}>
                      <span
                        {...fieldAttr("happy-bamboo.services.cta-button-text")}
                      >
                        {ctaButtonText}
                      </span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
