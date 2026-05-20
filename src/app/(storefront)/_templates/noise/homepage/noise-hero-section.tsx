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
  const title = heroTitle ?? "Made with intention.";
  const tagline =
    heroTagline ??
    "Considered apparel made in small batches. Built to be worn, mended, and worn again.";
  const btnText = heroPrimaryButtonText ?? "Shop the Edit";
  const btnLink = heroPrimaryButtonLink ?? "/shop";

  return (
    <section
      className="border-foreground relative overflow-hidden border-b-2"
      style={{
        height: "clamp(520px, 82vh, 900px)",
        background: "var(--vn-steel-deep)",
      }}
    >
      {/* Background */}
      {heroImage ? (
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

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,13,11,.15) 0%, rgba(14,13,11,.5) 100%)",
        }}
      />

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
              color: "rgba(255,255,255,.85)",
              maxWidth: "52ch",
            }}
          >
            {tagline}
          </p>

          <Link
            href={btnLink}
            className="font-mono uppercase transition-all"
            style={{
              fontSize: "11px",
              letterSpacing: ".28em",
              padding: "15px 38px",
              background: "#fff",
              color: "var(--vn-ink)",
              border: "1px solid #fff",
              marginTop: "4px",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--vn-bone)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
            }}
          >
            {btnText}
          </Link>
        </motion.div>
      </div>

      {/* Bottom credit strip */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 pb-5"
        style={{ pointerEvents: "none" }}
      >
        <span
          className="font-serif text-xl leading-tight italic"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          Visual Noise
        </span>
        <span
          className="font-mono text-[10px] tracking-[.18em] uppercase"
          style={{ color: "rgba(255,255,255,.5)" }}
        >
          Detroit, Michigan
        </span>
      </div>
    </section>
  );
}
