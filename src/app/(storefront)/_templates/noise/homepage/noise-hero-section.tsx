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
  heroOverline,
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
      className="border-foreground relative overflow-hidden border-b"
      style={{
        height: "clamp(520px, 100svh, 900px)",
        background: "var(--vn-steel-deep)",
      }}
      {...sectionAttrs}
    >
      {/* Background — video takes priority over image */}
      {heroVideo ? (
        <video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
        />
      ) : heroImage ? (
        <Image
          src={heroImage}
          alt={title}
          fill
          className="object-cover"
          style={{ objectPosition: "50% 20%" }}
          priority
          sizes="100vw"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, var(--vn-steel-deep) 0%, var(--vn-steel) 100%)`,
          }}
        >
          {/* Noise grain texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "var(--noise-grain)",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
            }}
          />
          {/* Large watermark */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p
              className="font-serif leading-none italic select-none"
              style={{
                fontSize: "clamp(8rem, 22vw, 18rem)",
                color: "var(--vn-bone)",
                opacity: 0.05,
              }}
            >
              VN
            </p>
          </div>
        </div>
      )}

      {/* Dark gradient overlay — center-weighted so foreground text keeps
          ≥4.5:1 contrast over arbitrary light user-uploaded images/video
          (WCAG 1.4.3). */}
      <div className="vn-hero-overlay absolute inset-0" />

      {/* Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-6"
          style={{ maxWidth: "860px", width: "100%" }}
        >
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3rem, 9vw, 7.5rem)",
              letterSpacing: "-0.03em",
              color: "#fff",
              textShadow: "0 2px 40px rgba(0,0,0,.3)",
            }}
          >
            {title}
          </h1>

          <p
            className="font-sans leading-relaxed"
            style={{
              fontSize: "clamp(14px, 1.1vw, 16px)",
              color: "rgba(255,255,255,.9)",
              textShadow: "0 1px 14px rgba(0,0,0,.55)",
              maxWidth: "52ch",
            }}
          >
            {tagline}
          </p>

          <Link
            href={btnLink}
            className="vn-btn-hero vn-focus-on-dark mt-1"
          >
            {btnText}
          </Link>
        </motion.div>
      </div>

      {/* Bottom credit strip */}
      {(wordmark ?? locationTag) && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 pb-5"
          style={{ pointerEvents: "none" }}
        >
          {wordmark && (
            <span
              className="font-serif text-xl leading-tight italic"
              style={{
                color: "rgba(255,255,255,.85)",
                textShadow: "0 1px 8px rgba(0,0,0,.6)",
              }}
            >
              {wordmark}
            </span>
          )}
          {locationTag && (
            <span
              className="font-mono text-[10px] tracking-[.18em] uppercase"
              style={{
                color: "rgba(255,255,255,.75)",
                textShadow: "0 1px 8px rgba(0,0,0,.6)",
              }}
            >
              {locationTag}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
