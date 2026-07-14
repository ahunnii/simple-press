import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
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
      {/* Hero */}
      <section {...sectionGroupAttr("about", "hero")} className="bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn
              direction="right"
              className="flex-1 text-center md:text-left"
            >
              <p
                className="text-primary mb-3 text-sm font-semibold tracking-wider uppercase"
                {...fieldAttr("bamboo.about.hero-tagline")}
              >
                {f["bamboo.about.hero-tagline"]}
              </p>
              <h1 className="text-foreground font-heading text-4xl font-bold tracking-tight md:text-5xl">
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.about.hero-heading")}
                >
                  {f["bamboo.about.hero-heading"]}
                </span>
              </h1>
              <p
                className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed"
                {...fieldAttr("bamboo.about.hero-intro")}
              >
                {f["bamboo.about.hero-intro"]}
              </p>
            </FadeIn>
            <FadeIn direction="left" delay={0.15} className="flex-1">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
                <Image
                  src={f["bamboo.about.hero-image"]!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Mission -- text + image staggered */}
      <section
        {...sectionGroupAttr("about", "mission")}
        className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
      >
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl">
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
            <h2
              className="text-foreground font-heading text-3xl font-bold tracking-tight"
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
        className="bg-secondary/50 py-20"
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <h2 className="text-foreground font-heading text-center text-3xl font-bold tracking-tight">
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
                <Card className="border-border/60 bg-card h-full">
                  <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                    <div
                      className="bg-primary/10 flex size-14 items-center justify-center rounded-full"
                      aria-hidden="true"
                    >
                      <value.icon className="text-primary size-7" />
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
        className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
      >
        <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
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
            <h2
              className="text-foreground font-heading text-3xl font-bold tracking-tight"
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
          className="bg-secondary/50 py-20"
        >
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn direction="up">
              <h2 className="text-foreground font-heading text-center text-3xl font-bold tracking-tight">
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
              className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
              staggerDelay={0.15}
            >
              {whyBambooFacts?.map((item, i) => (
                <StaggerItem
                  key={i}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div
                    className="bg-primary/10 flex size-12 items-center justify-center rounded-full"
                    aria-hidden="true"
                  >
                    <item.icon className="text-primary size-6" />
                  </div>
                  <h3 className="text-foreground font-heading text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
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
          className="mx-auto max-w-7xl px-4 py-20 lg:px-8"
        >
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn direction="up" className="flex-1">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
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
              <h2
                className="text-foreground font-heading text-3xl font-bold tracking-tight"
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
                      className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg"
                      aria-hidden="true"
                    >
                      <item.icon className="text-primary size-5" />
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

      {/* Detroit Roots -- full-width accent */}
      <section {...sectionGroupAttr("about", "detroit")} className="bg-primary">
        <FadeIn
          direction="up"
          className="mx-auto max-w-7xl px-4 py-20 text-center lg:px-8"
        >
          <h2 className="text-primary-foreground font-heading text-3xl font-bold tracking-tight">
            <span
              className="text-balance"
              {...fieldAttr("bamboo.about.detroit-heading")}
            >
              {f["bamboo.about.detroit-heading"]}
            </span>
          </h2>
          <p
            className="text-primary-foreground/80 mx-auto mt-4 max-w-2xl leading-relaxed"
            {...fieldAttr("bamboo.about.detroit-body")}
          >
            {f["bamboo.about.detroit-body"]}
          </p>
        </FadeIn>
      </section>

      {/* CTA */}
      {isSectionVisible(
        business?.siteContent?.customFields,
        "bamboo",
        "about.cta",
      ) && (
        <section {...sectionGroupAttr("about", "cta")} className="py-20">
          <ScaleIn>
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center">
              <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.about.cta-heading")}
                >
                  {f["bamboo.about.cta-heading"]}
                </span>
              </h2>
              <p
                className="text-muted-foreground leading-relaxed"
                {...fieldAttr("bamboo.about.cta-text")}
              >
                {f["bamboo.about.cta-text"]}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href={f["bamboo.about.cta-button-link"]!}>
                    <span {...fieldAttr("bamboo.about.cta-button-text")}>
                      {f["bamboo.about.cta-button-text"]}
                    </span>{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href={f["bamboo.about.cta-secondary-button-link"]!}>
                    <span
                      {...fieldAttr("bamboo.about.cta-secondary-button-text")}
                    >
                      {f["bamboo.about.cta-secondary-button-text"]}
                    </span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </ScaleIn>
        </section>
      )}
    </PageTransition>
  );
}
