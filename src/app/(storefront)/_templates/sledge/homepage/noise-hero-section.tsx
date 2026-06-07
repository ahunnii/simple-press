"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

type NoiseHeroSectionProps = {
  heroVideo?: string;
  heroImage?: string;
  heroOverline?: string;
  heroTitle?: string;
  heroTagline?: string;
  heroPrimaryButtonText?: string;
  heroPrimaryButtonLink?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Business name shown in the bottom credit strip. */
  wordmark?: string;
  /** Location tag shown in the bottom credit strip. Leave undefined to hide. */
  locationTag?: string;
};

export function NoiseHeroSection({
  heroVideo,
  heroImage,
  heroTitle,
  heroTagline,
  heroPrimaryButtonText,
  heroPrimaryButtonLink,
  sectionAttrs,
  wordmark,
  locationTag,
}: NoiseHeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.5;
  }, [heroVideo]);

  const title = heroTitle ?? "Made with intention.";
  const tagline =
    heroTagline ??
    "Considered apparel made in small batches. Built to be worn, mended, and worn again.";
  const btnText = heroPrimaryButtonText ?? "Shop the Edit";
  const btnLink = heroPrimaryButtonLink ?? "/shop";

  return (
    <section
      className="border-foreground relative h-[clamp(520px,100svh,900px)] overflow-hidden border-b bg-[var(--sl-dark)]"
      {...sectionAttrs}
    >
      {heroVideo ? (
        <video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
        />
      ) : heroImage ? (
        <Image
          src={heroImage}
          alt={title}
          fill
          className="object-cover object-[50%_20%]"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--sl-dark)] to-[var(--sl-green)]">
          <div className="sl-hero-grain absolute inset-0 opacity-[0.04]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-serif text-[clamp(8rem,22vw,18rem)] leading-none text-[var(--sl-cream)] italic opacity-5 select-none">
              VN
            </p>
          </div>
        </div>
      )}

      <div className="vn-hero-overlay absolute inset-0" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex w-full max-w-[860px] flex-col items-center gap-6"
        >
          <h1 className="font-serif text-[clamp(3rem,9vw,7.5rem)] leading-none tracking-[-0.03em] text-white italic drop-shadow-[0_2px_40px_rgba(0,0,0,0.3)]">
            {title}
          </h1>

          <p className="max-w-[52ch] font-sans text-[clamp(14px,1.1vw,16px)] leading-relaxed text-white/90 drop-shadow-[0_1px_14px_rgba(0,0,0,0.55)]">
            {tagline}
          </p>

          <Link href={btnLink} className="vn-btn-hero vn-focus-on-dark mt-1">
            {btnText}
          </Link>
        </motion.div>
      </div>

      {(wordmark ?? locationTag) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-5 pb-5">
          {wordmark && (
            <span className="font-serif text-xl leading-tight text-white/85 italic drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
              {wordmark}
            </span>
          )}
          {locationTag && (
            <span className="font-mono text-[10px] tracking-[.18em] text-white/75 uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
              {locationTag}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
