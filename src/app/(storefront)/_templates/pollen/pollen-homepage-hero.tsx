"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { buttonVariants } from "~/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
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

type Props = {
  title: string;
  subtitle: string;
  descriptionText: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
};

export function PollenHero({
  title,
  subtitle,
  descriptionText,
  buttonText,
  buttonLink,
  imageUrl,
}: Props) {
  return (
    <section className="relative flex h-svh min-h-[70vh] items-center justify-center overflow-hidden py-20 sm:py-28 md:min-h-[80vh] md:py-40">
      {/* Background image */}
      <Image
        src={imageUrl}
        alt="Bumblebee pollinating lavender flowers"
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
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-xs font-medium tracking-[0.2em] text-white uppercase sm:text-sm md:text-base"
          >
            {title}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-3xl leading-tight font-bold text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-9xl"
          >
            {subtitle}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl"
          >
            {descriptionText}
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link
              href={buttonLink}
              className={buttonVariants({
                size: "lg",
                className:
                  "gap-2 bg-[#5e8b4a]! px-6 py-4 text-base font-medium text-white hover:bg-[#5e8b4a]/90! sm:px-8 sm:py-6 sm:text-lg!",
              })}
            >
              {buttonText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
