import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import {
  DEFAULT_BAMBOO_NATIONWIDE_FACTS,
  DEFAULT_BAMBOO_VALUES,
  DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
} from ".";
import { resolveFields } from "..";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";

// Eyebrow-over-serif-h2 rhythm (docs/templates/bamboo/design.md "Section
// rhythm"). Section eyebrows below are decorative labels -- not bound to any
// field, mirroring happy-bamboo's hardcoded Badge labels -- so they add no
// new field keys.
const eyebrowClass =
  "mb-3 block text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase";
const eyebrowOnForestClass =
  "mb-3 block text-xs font-semibold tracking-widest text-[var(--bam-gold-soft)] uppercase";
const h2Class =
  "text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl";
const h2OnForestClass =
  "font-serif text-4xl font-bold tracking-tight text-[var(--bam-cream)] md:text-5xl";
const iconCircleClass =
  "flex items-center justify-center rounded-full border border-[var(--bam-gold)]/40";
const cardClass =
  "h-full rounded-2xl border-[var(--bam-hairline)] bg-card transition-shadow hover:shadow-md";

export function BambooAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.about.hero-tagline",
    "bamboo.about.hero-heading",
    "bamboo.about.hero-intro",
    "bamboo.about.hero-image",
    "bamboo.about.mission-image",
    "bamboo.about.mission-heading",
    "bamboo.about.mission-paragraph",
    "bamboo.about.values-heading",
    "bamboo.about.supplier-image",
    "bamboo.about.supplier-heading",
    "bamboo.about.supplier-text",
    "bamboo.about.why-bamboo-heading",
    "bamboo.about.why-bamboo-intro",
    "bamboo.about.nationwide-image",
    "bamboo.about.nationwide-heading",
    "bamboo.about.nationwide-text",
    "bamboo.about.detroit-heading",
    "bamboo.about.detroit-body",
    "bamboo.about.cta-heading",
    "bamboo.about.cta-text",
    "bamboo.about.cta-button-link",
    "bamboo.about.cta-button-text",
    "bamboo.about.cta-secondary-button-link",
    "bamboo.about.cta-secondary-button-text",
  ]);

  const nationwideList = parseTemplateIconListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "bamboo.about.nationwide-facts-list",
    ),
    DEFAULT_BAMBOO_NATIONWIDE_FACTS,
  );

  const valuesList = parseTemplateIconListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "bamboo.about.values-list",
    ),
    DEFAULT_BAMBOO_VALUES,
  );

  const whyBambooFacts = parseTemplateIconListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "bamboo.about.why-bamboo-facts-list",
    ),
    DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
  );

  return (
    <PageTransition>
      {/* Hero -- shared arch-portrait page hero */}
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("about", "hero")}
        eyebrow={f["bamboo.about.hero-tagline"]}
        eyebrowFieldKey="bamboo.about.hero-tagline"
        title={f["bamboo.about.hero-heading"]}
        titleFieldKey="bamboo.about.hero-heading"
        lede={f["bamboo.about.hero-intro"]}
        ledeFieldKey="bamboo.about.hero-intro"
        image={f["bamboo.about.hero-image"]}
        imagePriority
      />

      {/* Mission -- text + image staggered */}
      <section
        {...sectionGroupAttr("about", "mission")}
        className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
      >
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-[var(--bam-hairline)]">
              <Image
                src={f["bamboo.about.mission-image"]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <span className={eyebrowClass}>Our Story</span>
            <h2
              className={h2Class}
              {...fieldAttr("bamboo.about.mission-heading")}
            >
              {f["bamboo.about.mission-heading"]}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p
                className="whitespace-pre-line"
                {...fieldAttr("bamboo.about.mission-paragraph")}
              >
                {f["bamboo.about.mission-paragraph"]}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section
        {...sectionGroupAttr("about", "values")}
        className="bg-[var(--bam-cream-deep)] py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up" className="text-center">
            <span className={eyebrowClass + " text-center"}>Our Values</span>
            <h2 className={h2Class}>
              <span
                className="text-balance"
                {...fieldAttr("bamboo.about.values-heading")}
              >
                {f["bamboo.about.values-heading"]}
              </span>
            </h2>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerDelay={0.12}
          >
            {valuesList?.map((value, i) => (
              <StaggerItem key={i}>
                <Card className={cardClass}>
                  <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                    <div
                      className={iconCircleClass + " size-14"}
                      aria-hidden="true"
                    >
                      <value.icon className="size-7 text-[var(--bam-forest)]" />
                    </div>
                    <h3 className="text-card-foreground font-heading text-lg font-semibold">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Supplier */}
      <section
        {...sectionGroupAttr("about", "supplier")}
        className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
      >
        <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-[var(--bam-hairline)]">
              <Image
                src={f["bamboo.about.supplier-image"]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <span className={eyebrowClass}>Our Promise</span>
            <h2
              className={h2Class}
              {...fieldAttr("bamboo.about.supplier-heading")}
            >
              {f["bamboo.about.supplier-heading"]}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p
                className="whitespace-pre-line"
                {...fieldAttr("bamboo.about.supplier-text")}
              >
                {f["bamboo.about.supplier-text"]}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Why Bamboo */}
      {isSectionVisible(
        business?.siteContent?.customFields,
        "bamboo",
        "about.whyBamboo",
      ) && (
        <section
          {...sectionGroupAttr("about", "whyBamboo")}
          className="bg-[var(--bam-cream-deep)] py-20 md:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn direction="up" className="text-center">
              <span className={eyebrowClass + " text-center"}>The Science</span>
              <h2 className={h2Class}>
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.about.why-bamboo-heading")}
                >
                  {f["bamboo.about.why-bamboo-heading"]}
                </span>
              </h2>
              <p
                className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center"
                {...fieldAttr("bamboo.about.why-bamboo-intro")}
              >
                {f["bamboo.about.why-bamboo-intro"]}
              </p>
            </FadeIn>
            <StaggerContainer
              className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
              staggerDelay={0.15}
            >
              {whyBambooFacts?.map((item, i) => (
                <StaggerItem key={i}>
                  <Card className={cardClass}>
                    <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                      <div
                        className={iconCircleClass + " size-12"}
                        aria-hidden="true"
                      >
                        <item.icon className="size-6 text-[var(--bam-forest)]" />
                      </div>
                      <h3 className="text-card-foreground font-heading text-lg font-semibold">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* Nationwide Shipping + Service */}
      {isSectionVisible(
        business?.siteContent?.customFields,
        "bamboo",
        "about.nationwide",
      ) && (
        <section
          {...sectionGroupAttr("about", "nationwide")}
          className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
        >
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn direction="up" className="flex-1">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-[var(--bam-hairline)]">
                <Image
                  src={f["bamboo.about.nationwide-image"]!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={0.1} className="flex-1">
              <span className={eyebrowClass}>Our Reach</span>
              <h2
                className={h2Class}
                {...fieldAttr("bamboo.about.nationwide-heading")}
              >
                {f["bamboo.about.nationwide-heading"]}
              </h2>
              <p
                className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line"
                {...fieldAttr("bamboo.about.nationwide-text")}
              >
                {f["bamboo.about.nationwide-text"]}
              </p>
              <StaggerContainer
                className="mt-8 flex flex-col gap-5"
                staggerDelay={0.1}
              >
                {nationwideList?.map((item, i) => (
                  <StaggerItem key={i} className="flex items-start gap-4">
                    <div
                      className={iconCircleClass + " size-10 shrink-0"}
                      aria-hidden="true"
                    >
                      <item.icon className="size-5 text-[var(--bam-forest)]" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Detroit Roots -- forest banner card carrying bamboo's own gold wave
          language (docs/templates/bamboo/design.md "Deliberate divergences"):
          the same crest that lips into the homepage value band, scaled down to
          run along this card's bottom inner edge. */}
      <section
        {...sectionGroupAttr("about", "detroit")}
        className="py-16 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <div className="relative overflow-hidden rounded-2xl bg-[var(--bam-forest)] px-8 py-10 pb-16 md:px-12 md:py-14 md:pb-20">
              {/* Gold-soft ghost wave lip -- the value band's curve at reduced
                  opacity, via the shared divider. */}
              <BambooWaveDivider
                lip="var(--bam-gold-soft)"
                fill="var(--bam-gold-soft)"
                lipOpacity={0.18}
                fillOpacity={0.32}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 md:h-14"
              />

              <div className="relative text-center md:text-left">
                <span className={eyebrowOnForestClass}>Our Roots</span>
                <h2 className={h2OnForestClass}>
                  <span
                    className="text-balance"
                    {...fieldAttr("bamboo.about.detroit-heading")}
                  >
                    {f["bamboo.about.detroit-heading"]}
                  </span>
                </h2>
                <p
                  className="mt-4 leading-relaxed text-[var(--bam-cream)]/80"
                  {...fieldAttr("bamboo.about.detroit-body")}
                >
                  {f["bamboo.about.detroit-body"]}
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA -- strong closing band */}
      {isSectionVisible(
        business?.siteContent?.customFields,
        "bamboo",
        "about.cta",
      ) && (
        <section {...sectionGroupAttr("about", "cta")}>
          {/* Top wave only -- the preceding Detroit section is cream, so the
              divider's transparent-above area composites correctly; the
              footer brings its own lip below, so no bottom wave here. */}
          <BambooWaveDivider className="-mb-px h-14 md:h-24" />
          <div className="bg-gradient-to-b from-[var(--bam-forest)] to-[var(--bam-forest-deep)] py-20 md:py-28">
            <ScaleIn>
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center">
                <span className={eyebrowOnForestClass + " text-center"}>
                  Join Us
                </span>
                <h2 className={h2OnForestClass}>
                  <span
                    className="text-balance"
                    {...fieldAttr("bamboo.about.cta-heading")}
                  >
                    {f["bamboo.about.cta-heading"]}
                  </span>
                </h2>
                <p
                  className="leading-relaxed text-[var(--bam-cream)]/80"
                  {...fieldAttr("bamboo.about.cta-text")}
                >
                  {f["bamboo.about.cta-text"]}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <Button
                    size="lg"
                    asChild
                    className="group rounded-full bg-[var(--bam-cream)] text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)]"
                  >
                    <Link href={f["bamboo.about.cta-button-link"]!}>
                      <span {...fieldAttr("bamboo.about.cta-button-text")}>
                        {f["bamboo.about.cta-button-text"]}
                      </span>
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                  <Link
                    href={f["bamboo.about.cta-secondary-button-link"]!}
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--bam-gold-soft)] underline-offset-4 hover:underline"
                  >
                    <span
                      {...fieldAttr("bamboo.about.cta-secondary-button-text")}
                    >
                      {f["bamboo.about.cta-secondary-button-text"]}
                    </span>
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </ScaleIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
