"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/page-animations";
import { fieldAttr } from "~/lib/preview/section-attrs";

export function HappyBambooHeroSection({
  heroImage,
  heroWelcome = "Welcome to",
  heroTitle = "Happy Bamboo",
  heroTagline = "Where Comfort Meets Sustainability!",
  heroDescription = `Luxuriously soft, tree-free happy-bamboo paper products crafted in Detroit. Because what you bring into your home should be as thoughtful as the life you build in it.`,
  heroPrimaryButtonText = "Shop Now",
  heroPrimaryButtonLink = "/shop",
  sectionAttrs,
}: {
  heroImage?: string;
  heroWelcome?: string;
  heroTitle?: string;
  heroTagline?: string;
  heroDescription?: string;
  heroPrimaryButtonText?: string;
  heroPrimaryButtonLink?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  return (
    <section
      className="relative min-h-[90vh] overflow-hidden"
      {...sectionAttrs}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={!!heroImage ? heroImage : "/images/hero-bamboo.jpg"}
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay across the full image for text legibility */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 container mx-auto flex min-h-[90vh] items-center justify-center px-4 py-20">
        <div className="flex max-w-3xl flex-col items-center text-center">
          {/* <FadeIn delay={0} className="mb-4 flex items-center gap-2">
            <Leaf className="text-primary h-5 w-5" />
            <span className="text-lg font-semibold tracking-widest text-white/90 uppercase">
              {heroWelcome}
            </span>
          </FadeIn> */}

          <FadeIn delay={0}>
            <h1
              className="mb-2 text-5xl leading-tight font-bold text-white uppercase md:text-7xl lg:text-7xl"
              {...fieldAttr("happy-bamboo.homepage.hero-welcome")}
            >
              {heroWelcome}
            </h1>
          </FadeIn>

          <FadeIn delay={0.15}>
            <p
              className="text-primary mb-3 text-4xl leading-tight font-extrabold drop-shadow-md md:text-5xl lg:text-6xl"
              {...fieldAttr("happy-bamboo.homepage.hero-title")}
            >
              {heroTitle}
            </p>
          </FadeIn>

          {/* <FadeIn delay={0.15}>
            <h1 className="mb-4 text-6xl leading-tight font-bold text-white md:text-7xl lg:text-8xl">
              {heroTitle}
            </h1>
          </FadeIn> */}

          <FadeIn delay={0.25}>
            <p
              className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold tracking-wide text-white/80 md:text-3xl"
              {...fieldAttr("happy-bamboo.homepage.hero-tagline")}
            >
              <Leaf
                className="text-primary h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              {heroTagline}
            </p>
          </FadeIn>

          <FadeIn delay={0.35}>
            <p
              className="mb-10 text-xl text-white/80 md:text-2xl"
              {...fieldAttr("happy-bamboo.homepage.hero-description")}
            >
              {heroDescription}
            </p>
          </FadeIn>

          {/* <FadeIn delay={0.25}>
            <h2 className="mb-4 text-4xl font-semibold text-white md:text-5xl">
              {heroTagline}
            </h2>
          </FadeIn> */}

          {/* <FadeIn delay={0.35}>
            <p className="mb-10 text-xl text-white/80 md:text-2xl">
              {heroDescription}
            </p>
          </FadeIn> */}

          <FadeIn delay={0.45}>
            <Button
              size="lg"
              className="group bg-[var(--hb-brand)] px-8 text-lg text-white hover:bg-[var(--hb-brand)]/90"
              asChild
            >
              <Link
                href={heroPrimaryButtonLink ?? "/shop"}
                {...fieldAttr("happy-bamboo.homepage.hero-primary-button-text")}
              >
                {heroPrimaryButtonText}
                <ArrowRight
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
