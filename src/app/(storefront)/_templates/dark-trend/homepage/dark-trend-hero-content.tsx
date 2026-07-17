"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  title: string;
  buttonText: string;
  buttonLink: string;
  /** Field key for the title, so the preview can live-patch it in place. */
  titleFieldKey?: string;
  /** Field key for the button text, so the preview can live-patch it in place. */
  buttonTextFieldKey?: string;
};

export function DarkTrendHeroContent({
  title,
  buttonText,
  buttonLink,
  titleFieldKey,
  buttonTextFieldKey,
}: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="max-w-3xl">
      <motion.h1
        className="text-4xl font-bold tracking-tight text-white drop-shadow-sm md:text-6xl lg:text-9xl"
        initial={
          shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
      >
        {title}
      </motion.h1>
      <motion.div
        initial={
          shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.5,
          delay: shouldReduceMotion ? 0 : 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Link
          href={!buttonLink ? "/shop" : buttonLink}
          className="mt-8 inline-block"
        >
          <motion.span
            className="inline-flex items-center rounded-md bg-violet-600 px-8 py-3 text-sm font-medium tracking-wide text-white"
            whileHover={
              shouldReduceMotion
                ? undefined
                : { scale: 1.03, backgroundColor: "rgb(109, 40, 217)" }
            }
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2 }}
            {...(buttonTextFieldKey ? fieldAttr(buttonTextFieldKey) : {})}
          >
            {!buttonText ? "SHOP NOW" : buttonText}
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}
