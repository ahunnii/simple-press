"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

type NoiseHeroSectionProps = {
  heroImage?: string;
  heroOverline?: string;
  heroTitle?: string;
  heroTagline?: string;
  heroPrimaryButtonText?: string;
  heroPrimaryButtonLink?: string;
};

export function NoiseHeroSection({
  heroImage,
  heroOverline,
  heroTitle,
  heroTagline,
  heroPrimaryButtonText,
  heroPrimaryButtonLink,
}: NoiseHeroSectionProps) {
  const title = heroTitle ?? "Fashion Shouldn't Be Quiet.";
  const tagline = heroTagline ?? "Haute couture crochet from Detroit — garments that move, speak, and command.";
  const btnText = heroPrimaryButtonText ?? "Shop the Collection";
  const btnLink = heroPrimaryButtonLink ?? "/shop";

  return (
    <section className="relative min-h-[88svh] bg-background">
      <div className="grid min-h-[88svh] grid-cols-1 lg:grid-cols-2">

        {/* Left — text content */}
        <div className="flex flex-col justify-center px-6 py-20 md:px-12 lg:px-16 lg:py-28">
          {/* Grain accent — subtle texture behind text column only */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-full opacity-[0.02] lg:w-1/2"
            style={{
              backgroundImage: "var(--noise-grain)",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
            }}
          />

          <div className="relative z-10 max-w-xl">
            {/* Overline */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 font-sans text-[9px] tracking-[0.45em] uppercase text-muted-foreground"
            >
              {heroOverline ?? "Visual Noise · Detroit"}
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-serif font-light leading-[1.06] tracking-tight text-foreground"
              style={{ fontSize: "clamp(2.75rem, 5.5vw, 5.5rem)" }}
            >
              {title}
            </motion.h1>

            {/* Thin rule */}
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="my-7 h-px w-16 bg-foreground/25"
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="max-w-sm font-sans text-sm leading-relaxed text-muted-foreground"
            >
              {tagline}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.72 }}
              className="mt-10 flex items-center gap-6"
            >
              <Link
                href={btnLink}
                className="inline-block border border-foreground bg-foreground px-10 py-3.5 font-sans text-[10px] tracking-[0.28em] uppercase text-background transition-all hover:bg-transparent hover:text-foreground"
              >
                {btnText}
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2.5 font-sans text-[10px] tracking-[0.22em] uppercase text-foreground/50 transition-colors hover:text-foreground"
              >
                Our Story
                <span className="h-px w-8 bg-current" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right — image: sharp edge, no gradient bleed */}
        <div className="relative min-h-[55vw] overflow-hidden lg:min-h-0">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={title}
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            /* Placeholder: steel panel with grain + subtle VN mark */
            <div className="absolute inset-0 bg-foreground">
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage: "var(--noise-grain)",
                  backgroundRepeat: "repeat",
                  backgroundSize: "200px 200px",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <p
                  className="select-none font-serif font-light italic leading-none text-background/10"
                  style={{ fontSize: "clamp(6rem, 18vw, 16rem)" }}
                >
                  VN
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
