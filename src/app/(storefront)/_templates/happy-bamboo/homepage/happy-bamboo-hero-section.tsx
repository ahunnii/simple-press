"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/page-animations";

export function HappyBambooHeroSection({
  heroImage,
  heroWelcome,
  heroTitle,
  heroTagline,
  heroDescription,
  heroPrimaryButtonText,
  heroPrimaryButtonLink,
  sectionAttrs,
}: {
  heroImage?: string;
  heroWelcome: string;
  heroTitle: string;
  /** Optional — no declared default, so a blank value renders nothing. */
  heroTagline?: string;
  heroDescription: string;
  heroPrimaryButtonText: string;
  heroPrimaryButtonLink: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  return (
    <section
      className="relative min-h-[90vh] overflow-hidden"
      {...sectionAttrs}
    >
      {/* Background — a saved photo, or a designed brand-gradient empty
          state when none is set (there is no bundled fallback photo). */}
      <div className="absolute inset-0 z-0">
        {heroImage && heroImage !== "/placeholder.svg" ? (
          <>
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover"
              priority
            />
            {/* Dark overlay across the full image for text legibility */}
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-[linear-gradient(135deg,var(--hb-brand-deep),var(--hb-brand)_55%,var(--hb-brand-muted))]"
            aria-hidden="true"
          >
            {/* Subtle scattered leaf texture — keeps the empty state on-brand
                without needing a bundled photo. Faded via a radial mask so it
                reads as texture, not clutter, behind the hero text. */}
            <div className="absolute inset-0 overflow-hidden opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
              <Leaf className="absolute top-[10%] left-[8%] h-28 w-28 -rotate-12 text-white" />
              <Leaf className="absolute top-[60%] left-[20%] h-16 w-16 rotate-45 text-white" />
              <Leaf className="absolute top-[15%] right-[12%] h-36 w-36 rotate-12 text-white" />
              <Leaf className="absolute right-[22%] bottom-[8%] h-20 w-20 -rotate-45 text-white" />
              <Leaf className="absolute bottom-[20%] left-[45%] h-14 w-14 rotate-90 text-white" />
            </div>
            {/* Light vignette for depth and extra contrast under the text */}
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
      </div>

      <div className="relative z-10 container mx-auto flex min-h-[90vh] items-center justify-center px-4 py-20">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <FadeIn delay={0}>
            <p
              className="mb-2 text-5xl leading-tight font-bold text-white uppercase md:text-7xl lg:text-7xl"
              {...fieldAttr("happy-bamboo.homepage.hero-welcome")}
            >
              {heroWelcome}
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <h1
              className="mb-3 text-4xl leading-tight font-extrabold text-[var(--hb-primary-on-dark)] drop-shadow-md md:text-5xl lg:text-6xl"
              {...fieldAttr("happy-bamboo.homepage.hero-title")}
            >
              {heroTitle}
            </h1>
          </FadeIn>

          {heroTagline && (
            <FadeIn delay={0.25}>
              <p className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold tracking-wide text-white/80 md:text-3xl">
                <Leaf
                  className="h-5 w-5 shrink-0 text-[var(--hb-primary-on-dark)]"
                  aria-hidden="true"
                />
                <span {...fieldAttr("happy-bamboo.homepage.hero-tagline")}>
                  {heroTagline}
                </span>
              </p>
            </FadeIn>
          )}

          <FadeIn delay={0.35}>
            <p
              className="mb-10 text-xl text-white/80 md:text-2xl"
              {...fieldAttr("happy-bamboo.homepage.hero-description")}
            >
              {heroDescription}
            </p>
          </FadeIn>

          <FadeIn delay={0.45}>
            <Button
              size="lg"
              className="group bg-[var(--hb-brand)] px-8 text-lg text-white hover:bg-[var(--hb-brand)]/90"
              asChild
            >
              <Link href={heroPrimaryButtonLink}>
                <span
                  {...fieldAttr(
                    "happy-bamboo.homepage.hero-primary-button-text",
                  )}
                >
                  {heroPrimaryButtonText}
                </span>
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
