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
  const title = heroTitle ?? "Because fashion shouldn't be quiet.";
  const tagline =
    heroTagline ??
    "Haute couture crochet from Detroit — garments that move, speak, and command every room they enter.";
  const btnText = heroPrimaryButtonText ?? "Shop the Collection";
  const btnLink = heroPrimaryButtonLink ?? "/shop";

  return (
    <section
      className="border-b-2 border-foreground"
      style={{ background: "var(--vn-paper)" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        style={{ minHeight: "clamp(480px, 80vh, 900px)" }}
      >
        {/* LEFT — Image: dominant visual anchor.
            Mobile: aspect-[4/5] container. Desktop: stretches to fill grid row. */}
        <div
          className="relative aspect-[4/5] overflow-hidden border-b-2 border-foreground lg:aspect-auto lg:border-b-0 lg:border-r-2"
          style={{ background: "var(--vn-steel-deep)" }}
        >
          {heroImage ? (
            <Image
              src={heroImage}
              alt={title}
              fill
              className="object-cover"
              style={{ objectPosition: "50% 20%" }}
              priority
              sizes="(max-width: 768px) 100vw, 58vw"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))` }}>
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "var(--noise-grain)",
                  backgroundRepeat: "repeat",
                  backgroundSize: "200px 200px",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <p
                  className="select-none font-serif italic leading-none"
                  style={{ fontSize: "clamp(6rem, 18vw, 14rem)", color: "var(--vn-bone)", opacity: 0.08 }}
                >
                  VN
                </p>
              </div>
            </div>
          )}

          {/* Corner tags */}
          <div
            className="absolute left-5 top-5 font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            {heroOverline ?? "S/S 2026"}
          </div>
          <div
            className="absolute right-5 top-5 font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            New Collection
          </div>

          {/* Bottom gradient overlay */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-5 pt-16"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 30%, transparent)" }}
          >
            <span
              className="font-serif italic text-2xl leading-tight"
              style={{ color: "var(--vn-bone)" }}
            >
              Visual Noise
            </span>
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: "var(--vn-bone)", opacity: 0.7 }}
            >
              Detroit, Michigan
            </span>
          </div>
        </div>

        {/* RIGHT — Slogan text */}
        <div
          className="flex flex-col justify-between gap-6 px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16 lg:gap-8"
          style={{ background: "var(--vn-paper)" }}
        >
          {/* Top eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex gap-2 flex-wrap"
          >
            <span className="vn-stamp">Visual Noise · Detroit</span>
          </motion.div>

          {/* Main slogan — the actual H1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex items-center"
          >
            <h1
              className="font-serif italic leading-[0.92] tracking-tight"
              style={{ fontSize: "clamp(2.6rem, 8vw, 7.5rem)", letterSpacing: "-0.035em" }}
            >
              {title}
            </h1>
          </motion.div>

          {/* Lede and CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col gap-6"
          >
            <p
              className="font-sans text-base leading-relaxed max-w-[42ch]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              {tagline}
            </p>

            <div className="flex gap-3 flex-wrap">
              <Link
                href={btnLink}
                className="font-mono text-[10.5px] tracking-[0.24em] uppercase px-6 py-3.5 transition-all"
                style={{ background: "var(--vn-ink)", color: "var(--vn-bone)", border: "1px solid var(--vn-ink)" }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--vn-steel)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--vn-steel)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--vn-ink)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--vn-ink)";
                }}
              >
                {btnText}
              </Link>
              <Link
                href="/about"
                className="font-mono text-[10.5px] tracking-[0.22em] uppercase px-6 py-3.5 transition-all"
                style={{ background: "transparent", color: "var(--vn-ink)", border: "1px solid var(--vn-ink)" }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--vn-ink)";
                  (e.currentTarget as HTMLElement).style.color = "var(--vn-bone)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--vn-ink)";
                }}
              >
                Our Story
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="grid grid-cols-3 border-t border-foreground/20 pt-5"
          >
            {[
              { k: "17", v: "New Looks" },
              { k: "60+", v: "Editions" },
              { k: "313", v: "Detroit" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 pr-4"
                style={{ borderRight: i < 2 ? "1px solid var(--vn-rule)" : "none" }}
              >
                <span
                  className="font-serif italic leading-none"
                  style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", letterSpacing: "-0.02em" }}
                >
                  {stat.k}
                </span>
                <span
                  className="font-mono text-[9px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {stat.v}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
