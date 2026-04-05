import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Droplets,
  Heart,
  Leaf,
  ShieldCheck,
  Sprout,
  TreePine,
  Truck,
  Users,
} from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../types";
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

import { resolveFields } from ".";

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
  ) as {
    icon: LucideIcon;
    title: string;
    description: string;
  }[];
  const valuesList = parseTemplateIconListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "bamboo.about.values-list",
    ),
  ) as {
    icon: LucideIcon;
    title: string;
    description: string;
  }[];

  const whyBambooFacts = parseTemplateIconListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "bamboo.about.why-bamboo-facts-list",
    ),
  ) as {
    icon: LucideIcon;
    title: string;
    description: string;
  }[];

  const nationwideFacts =
    !nationwideList || nationwideList.length === 0
      ? DEFAULT_NATIONWIDE_FACTS
      : nationwideList;

  const values =
    !valuesList || valuesList.length === 0 ? DEFAULT_VALUES : valuesList;

  const bambooFacts =
    !whyBambooFacts || whyBambooFacts.length === 0
      ? DEFAULT_WHY_BAMBOO_FACTS
      : whyBambooFacts;

  return (
    <PageTransition>
      {/* Hero */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn
              direction="right"
              className="flex-1 text-center md:text-left"
            >
              <p className="text-primary mb-3 text-sm font-semibold tracking-wider uppercase">
                {f["bamboo.about.hero-tagline"]}
              </p>
              <h1 className="text-foreground font-heading text-4xl font-bold tracking-tight md:text-5xl">
                <span className="text-balance">
                  {f["bamboo.about.hero-heading"]}
                </span>
              </h1>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed">
                {f["bamboo.about.hero-intro"]}
              </p>
            </FadeIn>
            <FadeIn direction="left" delay={0.15} className="flex-1">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
                <Image
                  src={f["bamboo.about.hero-image"]!}
                  alt="About page hero"
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
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-3/4 overflow-hidden rounded-2xl">
              <Image
                src={f["bamboo.about.mission-image"]!}
                alt="Mission section"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {f["bamboo.about.mission-heading"]}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p className="whitespace-pre-line">
                {f["bamboo.about.mission-paragraph"]}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <h2 className="text-foreground font-heading text-center text-3xl font-bold tracking-tight">
              <span className="text-balance">
                {f["bamboo.about.values-heading"]}
              </span>
            </h2>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerDelay={0.12}
          >
            {values.map((value, i) => (
              <StaggerItem key={i}>
                <Card className="border-border/60 bg-card h-full">
                  <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
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
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex flex-col items-center gap-12 md:flex-row-reverse">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
              <Image
                src={f["bamboo.about.supplier-image"]!}
                alt="Supplier section"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {f["bamboo.about.supplier-heading"]}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p className="whitespace-pre-line">
                {f["bamboo.about.supplier-text"]}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Why Bamboo */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <h2 className="text-foreground font-heading text-center text-3xl font-bold tracking-tight">
              <span className="text-balance">
                {f["bamboo.about.why-bamboo-heading"]}
              </span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center">
              {f["bamboo.about.why-bamboo-intro"]}
            </p>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
            staggerDelay={0.15}
          >
            {bambooFacts.map((item, i) => (
              <StaggerItem
                key={i}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
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

      {/* Nationwide Shipping + Service */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <FadeIn direction="up" className="flex-1">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
              <Image
                src={f["bamboo.about.nationwide-image"]!}
                alt="Nationwide shipping"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {f["bamboo.about.nationwide-heading"]}
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line">
              {f["bamboo.about.nationwide-text"]}
            </p>
            <StaggerContainer
              className="mt-8 flex flex-col gap-5"
              staggerDelay={0.1}
            >
              {nationwideFacts.map((item, i) => (
                <StaggerItem key={i} className="flex items-start gap-4">
                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
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

      {/* Detroit Roots -- full-width accent */}
      <section className="bg-primary">
        <FadeIn
          direction="up"
          className="mx-auto max-w-7xl px-4 py-20 text-center lg:px-8"
        >
          <h2 className="text-primary-foreground font-heading text-3xl font-bold tracking-tight">
            <span className="text-balance">
              {f["bamboo.about.detroit-heading"]}
            </span>
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-4 max-w-2xl leading-relaxed">
            {f["bamboo.about.detroit-body"]}
          </p>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="py-20">
        <ScaleIn>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              <span className="text-balance">
                {f["bamboo.about.cta-heading"]}
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {f["bamboo.about.cta-text"]}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href={f["bamboo.about.cta-button-link"]!}>
                  {f["bamboo.about.cta-button-text"]}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href={f["bamboo.about.cta-secondary-button-link"]!}>
                  {f["bamboo.about.cta-secondary-button-text"]}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </ScaleIn>
      </section>
    </PageTransition>
  );
}

const DEFAULT_VALUES = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description:
      "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint.",
  },
  {
    icon: Heart,
    title: "Premium Quality",
    description:
      "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "We believe in the power of community. We are always here to help you find the perfect product for your needs.",
  },
];
const DEFAULT_NATIONWIDE_FACTS = [
  {
    icon: Truck,
    title: "Nationwide Shipping",
    description:
      "We deliver our premium products to doorsteps across the country, carefully packaged and always on time.",
  },
  {
    icon: Building2,
    title: "Homes & Businesses",
    description:
      "From your bathroom to bustling restaurants, hotels, schools, and local stores -- we have solutions for every setting.",
  },
  {
    icon: ShieldCheck,
    title: "Customer-First Service",
    description:
      "Our dedicated Detroit-based team provides responsive, knowledgeable support for every order and inquiry.",
  },
];
const DEFAULT_WHY_BAMBOO_FACTS = [
  {
    icon: Sprout,
    title: "Rapid Growth",
    description:
      "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees.",
  },
  {
    icon: TreePine,
    title: "No Replanting Needed",
    description:
      "Bamboo regenerates from its own root system after harvest, which means the soil stays intact and carbon continues to be sequestered.",
  },
  {
    icon: Droplets,
    title: "Water Efficient",
    description:
      "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.",
  },
];
