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
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

import {
  FadeIn,
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "./bamboo-animations";

const VALUES_ICONS = [Leaf, Heart, Users] as const;
const BAMBOO_FACTS_ICONS = [Sprout, TreePine, Droplets] as const;
const SERVICE_HIGHLIGHTS_ICONS = [Truck, Building2, ShieldCheck] as const;

export function BambooAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

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
                {themeSpecificFields?.["bamboo.about.hero-tagline"] ??
                  "Our Story"}
              </p>
              <h1 className="text-foreground font-heading text-4xl font-bold tracking-tight md:text-5xl">
                <span className="text-balance">
                  {themeSpecificFields?.["bamboo.about.hero-heading"] ??
                    "Our Story"}
                </span>
              </h1>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed">
                {themeSpecificFields?.["bamboo.about.hero-intro"] ??
                  "Finally Results LLC was born from a simple belief: the everyday products in your home should be better -- better for your family, and better for the planet."}
              </p>
            </FadeIn>
            <FadeIn direction="left" delay={0.15} className="flex-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={
                    themeSpecificFields?.["bamboo.about.hero-image"] ??
                    "/placeholder.svg"
                  }
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
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src={
                  themeSpecificFields?.["bamboo.about.mission-image"] ??
                  "/placeholder.svg"
                }
                alt="Mission section"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {themeSpecificFields?.["bamboo.about.mission-heading"] ??
                "Why We Started"}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p className="whitespace-pre-line">
                {themeSpecificFields?.["bamboo.about.mission-paragraph"] ??
                  "Welcome to Finally Results LLC, your trusted supplier of retail household paper products nationwide. We take pride in offering top-quality items that enhance your everyday life, such as toilet paper. Our commitment to excellence is evident in the careful selection of materials, ensuring that our bathroom toilet tissue is made of 100% recycled virgin pulp, delivering septic-safe properties and superior absorbency."}
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
                {themeSpecificFields?.["bamboo.about.values-heading"] ??
                  "What We Stand For"}
              </span>
            </h2>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
            staggerDelay={0.12}
          >
            {VALUES_ICONS.map((Icon, i) => (
              <StaggerItem key={i}>
                <Card className="border-border/60 bg-card h-full">
                  <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
                      <Icon className="text-primary size-7" />
                    </div>
                    <h3 className="text-card-foreground font-heading text-lg font-semibold">
                      {themeSpecificFields?.[
                        `bamboo.about.value-${i + 1}-title`
                      ] ??
                        (i === 0
                          ? "Sustainability First"
                          : i === 1
                            ? "Premium Quality"
                            : "Community Driven")}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {themeSpecificFields?.[
                        `bamboo.about.value-${i + 1}-description`
                      ] ??
                        (i === 0
                          ? "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint."
                          : i === 1
                            ? "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands."
                            : "Rooted in Detroit, we believe in building something that serves our community and sets an example for responsible business.")}
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={
                  themeSpecificFields?.["bamboo.about.supplier-image"] ??
                  "/placeholder.svg"
                }
                alt="Supplier section"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {themeSpecificFields?.["bamboo.about.supplier-heading"] ??
                "More Than a Supplier"}
            </h2>
            <div className="text-muted-foreground mt-6 flex flex-col gap-4 leading-relaxed">
              <p className="whitespace-pre-line">
                {themeSpecificFields?.["bamboo.about.supplier-text"] ??
                  "At Finally Results LLC, our commitment extends beyond transactions. We take pride in providing top-notch household paper products that cater to a wide spectrum of needs -- from individual households to restaurants, hotels, schools, gas stations, local stores, and businesses of all sizes. We operate with the ethos of respecting every customer, valuing the relationships we build, and contributing to the collective well-being of the communities we serve. Located in the heart of Detroit, we extend our warmest welcome to you -- every customer is a member of our extended family."}
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
                {themeSpecificFields?.["bamboo.about.why-bamboo-heading"] ??
                  "Why Bamboo?"}
              </span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center">
              {themeSpecificFields?.["bamboo.about.why-bamboo-intro"] ??
                "Bamboo is nature's most remarkable renewable resource. Here's why we chose it as the foundation for everything we make."}
            </p>
          </FadeIn>
          <StaggerContainer
            className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3"
            staggerDelay={0.15}
          >
            {BAMBOO_FACTS_ICONS.map((Icon, i) => (
              <StaggerItem
                key={i}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                  <Icon className="text-primary size-6" />
                </div>
                <h3 className="text-foreground font-heading text-lg font-semibold">
                  {themeSpecificFields?.[`bamboo.about.fact-${i + 1}-title`] ??
                    (i === 0
                      ? "Rapid Growth"
                      : i === 1
                        ? "No Replanting Needed"
                        : "Water Efficient")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {themeSpecificFields?.[
                    `bamboo.about.fact-${i + 1}-description`
                  ] ??
                    (i === 0
                      ? "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees."
                      : i === 1
                        ? "Bamboo regenerates from its own root system after harvest, keeping soil intact and continuing to sequester carbon."
                        : "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.")}
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={
                  themeSpecificFields?.["bamboo.about.nationwide-image"] ??
                  "/placeholder.svg"
                }
                alt="Nationwide shipping"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.1} className="flex-1">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              {themeSpecificFields?.["bamboo.about.nationwide-heading"] ??
                "Nationwide Reach, Personal Touch"}
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line">
              {themeSpecificFields?.["bamboo.about.nationwide-text"] ??
                "Our commitment to exceptional service extends across the country. We proudly offer nationwide shipping, and our dedicated team ensures a seamless, satisfying experience for every order. Whether you have questions about our products or need help with a delivery, our responsive and knowledgeable representatives are here to help."}
            </p>
            <StaggerContainer
              className="mt-8 flex flex-col gap-5"
              staggerDelay={0.1}
            >
              {SERVICE_HIGHLIGHTS_ICONS.map((Icon, i) => (
                <StaggerItem key={i} className="flex items-start gap-4">
                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-primary size-5" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">
                      {themeSpecificFields?.[
                        `bamboo.about.nationwide-fact-${i + 1}-title`
                      ] ??
                        (i === 0
                          ? "Nationwide Shipping"
                          : i === 1
                            ? "Homes & Businesses"
                            : "Customer-First Service")}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {themeSpecificFields?.[
                        `bamboo.about.nationwide-fact-${i + 1}-description`
                      ] ??
                        (i === 0
                          ? "We deliver our premium products to doorsteps across the country, carefully packaged and always on time."
                          : i === 1
                            ? "From your bathroom to bustling restaurants, hotels, schools, and local stores -- we have solutions for every setting."
                            : "Our dedicated Detroit-based team provides responsive, knowledgeable support for every order and inquiry.")}
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
              {themeSpecificFields?.["bamboo.about.detroit-heading"] ??
                "Rooted in Detroit"}
            </span>
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-4 max-w-2xl leading-relaxed">
            {themeSpecificFields?.["bamboo.about.detroit-body"] ??
              "Detroit is a city that understands transformation. From the automotive revolution to its current renaissance in art, technology, and small business, this city teaches you that great things are built through perseverance and purpose. We chose to build Finally Results here because Detroit embodies everything our brand stands for: quality craftsmanship, community, and the belief that you can always do better."}
          </p>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="py-20">
        <ScaleIn>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 text-center">
            <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight">
              <span className="text-balance">
                {themeSpecificFields?.["bamboo.about.cta-heading"] ??
                  "Ready to Make the Switch?"}
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {themeSpecificFields?.["bamboo.about.cta-text"] ??
                "Join the families, businesses, and communities across the nation who trust Finally Results for their everyday essentials."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link
                  href={
                    themeSpecificFields?.["bamboo.about.cta-button-link"] ??
                    "/shop"
                  }
                >
                  {themeSpecificFields?.["bamboo.about.cta-button-text"] ??
                    "Shop Our Products"}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </div>
        </ScaleIn>
      </section>
    </PageTransition>
  );
}
