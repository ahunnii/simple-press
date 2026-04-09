"use client";

import Link from "next/link";
import { motion } from "motion/react";

type Props = {
  title: string;
  buttonText: string;
  buttonLink: string;
};

export function DarkTrendHeroContent({ title, buttonText, buttonLink }: Props) {
  return (
    <div className="max-w-3xl">
      <motion.h1
        className="text-4xl font-bold tracking-tight text-white drop-shadow-sm md:text-6xl lg:text-9xl"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {title}
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Link
          href={!buttonLink ? "/shop" : buttonLink}
          className="mt-8 inline-block"
        >
          <motion.span
            className="inline-flex items-center rounded-md bg-violet-500 px-8 py-3 text-sm font-medium tracking-wide text-white"
            whileHover={{ scale: 1.03, backgroundColor: "rgb(109, 40, 217)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {!buttonText ? "SHOP NOW" : buttonText}
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}
