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

import { resolveFields } from "../index";
import { BambooPageHero } from "../shared/bamboo-page-hero";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "bamboo.services.hero-tagline",
  "bamboo.services.hero-heading",
  "bamboo.services.hero-intro",
  "bamboo.services.hero-image",
  "bamboo.services.hero-bg-image",
  "bamboo.global.page-hero-bg-image",
  "bamboo.services.list-heading",
  "bamboo.services.card-link-text",
  "bamboo.services.empty-heading",
  "bamboo.services.empty-body",
  "bamboo.services.empty-button-text",
  "bamboo.services.cta-heading",
  "bamboo.services.cta-body",
  "bamboo.services.cta-button-text",
  "bamboo.services.cta-button-link",
];

/**
 * `/services` — the bamboo services index (parity finding PF16 / TP6, see
 * docs/templates/bamboo/parity-plan-2026-09-27.md).
 *
 * Ported from the sibling storefront's services index page component and
 * re-skinned to bamboo tokens, but the hero deliberately does NOT reuse
 * that source's split "page shelf" (bg-muted/50 flex row + aspect-video
 * image card) —
 * docs/templates/bamboo/design.md calls that composition an anti-reference
 * for interior pages. Instead the page opens on the shared
 * `shared/bamboo-page-hero.tsx` arch-portrait band (signature moment #5),
 * matching about/contact/blog. Content below sits on the SAME container
 * edge as the hero (`mx-auto max-w-7xl px-4 lg:px-8` — 112px at 1440, 16px
 * at 390) per baseline B1.7.
 */
export function BambooServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const heroBgImage =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- a cleared per-page override saves as "" and must still fall back to the global image
    f["bamboo.services.hero-bg-image"] ||
    f["bamboo.global.page-hero-bg-image"];

  const listHeading = f["bamboo.services.list-heading"];
  const cardLinkText = f["bamboo.services.card-link-text"];
  const emptyHeading = f["bamboo.services.empty-heading"];
  const emptyBody = f["bamboo.services.empty-body"];
  const emptyButtonText = f["bamboo.services.empty-button-text"];

  const ctaHeading = f["bamboo.services.cta-heading"];
  const ctaBody = f["bamboo.services.cta-body"];
  const ctaButtonText = f["bamboo.services.cta-button-text"];
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- resolveFields returns "" for an unset field, not null/undefined
  const ctaButtonLink = f["bamboo.services.cta-button-link"] || "/contact";

  return (
    <PageTransition>
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("services", "hero")}
        eyebrow={f["bamboo.services.hero-tagline"]}
        eyebrowFieldKey="bamboo.services.hero-tagline"
        title={f["bamboo.services.hero-heading"]}
        titleFieldKey="bamboo.services.hero-heading"
        lede={f["bamboo.services.hero-intro"]}
        ledeFieldKey="bamboo.services.hero-intro"
        image={f["bamboo.services.hero-image"]}
        imagePriority
        bgImage={heroBgImage}
      />

      {/* Services grid — same container edge as the hero above (B1.7) */}
      <section
        className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
        {...sectionGroupAttr("services", "list")}
      >
        <FadeIn className="mb-12">
          <div className="flex items-center gap-2">
            <Sparkles
              className="h-5 w-5 text-[var(--bam-forest)]"
              aria-hidden="true"
            />
            <h2
              className="text-foreground font-serif text-2xl font-bold tracking-tight md:text-3xl"
              {...fieldAttr("bamboo.services.list-heading")}
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
                    <article className="bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--bam-gold)]/30 hover:shadow-xl">
                      {/* Image */}
                      <div className="relative aspect-4/3 overflow-hidden">
                        {service.image ? (
                          <Image
                            src={service.image}
                            alt={service.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[var(--bam-forest)] to-[var(--bam-forest-deep)]">
                            <Leaf
                              className="h-12 w-12 text-white/40"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                        {itemCount > 0 && (
                          <div className="absolute right-4 bottom-4 left-4">
                            <Badge className="bg-[var(--bam-cream)]/90 text-[var(--bam-forest-deep)] hover:bg-[var(--bam-cream)]">
                              {itemCount}{" "}
                              {itemCount === 1 ? "option" : "options"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="font-heading text-card-foreground mb-2 text-xl font-bold transition-colors group-hover:text-[var(--bam-forest-deep)]">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--bam-forest)]">
                          <span {...fieldAttr("bamboo.services.card-link-text")}>
                            {cardLinkText}
                          </span>
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
        ) : (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package
                className="text-muted-foreground/50 mb-4 h-12 w-12"
                aria-hidden="true"
              />
              {!!emptyHeading && (
                <p
                  className="text-muted-foreground text-lg"
                  {...fieldAttr("bamboo.services.empty-heading")}
                >
                  {emptyHeading}
                </p>
              )}
              {!!emptyBody && (
                <p
                  className="text-muted-foreground mt-2 text-sm"
                  {...fieldAttr("bamboo.services.empty-body")}
                >
                  {emptyBody}
                </p>
              )}
              {!!emptyButtonText && (
                <Button asChild className="mt-6 rounded-full">
                  <Link href="/contact">
                    <span {...fieldAttr("bamboo.services.empty-button-text")}>
                      {emptyButtonText}
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          </FadeIn>
        )}
      </section>

      {/* Closing banner — flat cream-deep seam, no wave (cream ↔ cream-deep
          seams never get one, per design.md's wave guardrail) */}
      {isSectionVisible(customFields, "bamboo", "services.cta") && (
        <section
          className="border-t border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] py-20 md:py-28"
          {...sectionGroupAttr("services", "cta")}
        >
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <FadeIn>
              <div className="mx-auto max-w-2xl">
                <h2 className="text-foreground font-serif mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  <span {...fieldAttr("bamboo.services.cta-heading")}>
                    {ctaHeading}
                  </span>
                </h2>
                {ctaBody && (
                  <p
                    className="text-muted-foreground mb-8 leading-relaxed"
                    {...fieldAttr("bamboo.services.cta-body")}
                  >
                    {ctaBody}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild size="lg" className="rounded-full">
                    <Link href={ctaButtonLink}>
                      <span {...fieldAttr("bamboo.services.cta-button-text")}>
                        {ctaButtonText}
                      </span>
                      <ArrowRight
                        className="ml-2 h-4 w-4"
                        aria-hidden="true"
                      />
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
