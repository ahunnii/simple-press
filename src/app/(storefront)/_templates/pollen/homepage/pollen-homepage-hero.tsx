"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { buttonVariants } from "~/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const fadeUpStill = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerStill = {
  animate: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    },
  },
};

type Props = {
  title?: string;
  subtitle?: string;
  descriptionText?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function PollenHero({
  title,
  subtitle,
  descriptionText,
  buttonText,
  buttonLink,
  imageUrl,
  sectionAttrs,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const itemVariant = prefersReducedMotion ? fadeUpStill : fadeUp;
  const containerVariant = prefersReducedMotion ? staggerStill : stagger;
  const itemTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const };

  return (
    <section
      className="relative flex h-svh min-h-[70vh] items-center justify-center overflow-hidden py-20 sm:py-28 md:min-h-[80vh] md:py-40"
      {...sectionAttrs}
    >
      {/* Background image */}
      <Image
        src={imageUrl ?? ""}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      {/* Dark green overlay for readability */}
      <div className="absolute inset-0 bg-[#2a351f]/70" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col items-center gap-5 sm:gap-6"
          variants={containerVariant}
          initial="initial"
          animate="animate"
        >
          <motion.p
            variants={itemVariant}
            transition={itemTransition}
            className="text-xs font-medium tracking-[0.2em] text-white uppercase sm:text-sm md:text-base"
            {...fieldAttr("pollen.homepage.hero-title")}
          >
            {title}
          </motion.p>

          <motion.h1
            variants={itemVariant}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }
            }
            className="text-3xl leading-tight font-bold text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {subtitle?.trim() ? subtitle : title}
          </motion.h1>

          <motion.p
            variants={itemVariant}
            transition={itemTransition}
            className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl"
            {...fieldAttr("pollen.homepage.hero-description-text")}
          >
            {descriptionText}
          </motion.p>

          <motion.div variants={itemVariant} transition={itemTransition}>
            <Link
              href={buttonLink ?? "#!"}
              className={buttonVariants({
                size: "lg",
                className:
                  "gap-2 bg-[#215935]! px-6 py-4 text-base font-medium text-white hover:bg-[#1a4729]! sm:px-8 sm:py-6 sm:text-lg!",
              })}
              {...fieldAttr("pollen.homepage.hero-button-text")}
            >
              {buttonText}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
