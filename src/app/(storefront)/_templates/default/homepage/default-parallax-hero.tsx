"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  imageUrl: string;
  title: string;
  eyebrow?: string;
  description?: string;
  primaryText: string;
  primaryHref: string;
  secondaryText?: string;
  secondaryHref?: string;
  /**
   * Optional passthrough attributes spread on the root <section>.
   * Used by the preview overlay to annotate sections with data-sp-group.
   * Pattern: {...sectionGroupAttr("homepage", "hero")}
   */
  sectionAttrs?: Record<string, string>;
  /**
   * Per-field click-to-edit hotspot attributes, built by the caller via
   * `fieldAttr("default.homepage.hero-...")` — matches the convention used
   * by sibling homepage sections (fieldAttr() call sites live in
   * default-homepage.tsx; this component just spreads them onto the
   * corresponding text nodes).
   */
  eyebrowAttrs?: Record<string, string>;
  descriptionAttrs?: Record<string, string>;
  primaryTextAttrs?: Record<string, string>;
  secondaryTextAttrs?: Record<string, string>;
};

export function DefaultParallaxHero({
  imageUrl,
  title,
  eyebrow,
  description,
  primaryText,
  primaryHref,
  secondaryText,
  secondaryHref,
  sectionAttrs,
  eyebrowAttrs,
  descriptionAttrs,
  primaryTextAttrs,
  secondaryTextAttrs,
}: Props) {
  const bgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect the user's preference for reduced motion (WCAG 2.1 SC 2.3.3)
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const onScroll = () => {
      const y = window.scrollY;
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${y * 0.4}px)`;
      }
      if (textRef.current) {
        textRef.current.style.transform = `translateY(${y * 0.12}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      className="relative isolate h-[92vh] min-h-[620px] overflow-hidden bg-[#1a1a1a] text-white"
      {...sectionAttrs}
    >
      {/* Parallax background — oversized vertically so translateY never reveals a gap */}
      <div
        ref={bgRef}
        className="dt-parallax-bg absolute inset-x-0 will-change-transform"
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
        {/* Gradient — heavier at bottom where text sits */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-transparent" />
      </div>

      {/* Text — anchored at bottom-left */}
      <div
        ref={textRef}
        className="absolute inset-x-0 bottom-0 will-change-transform"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 pb-24">
          {eyebrow && (
            <span
              className="text-xs font-medium tracking-[0.14em] text-white/80 uppercase"
              {...eyebrowAttrs}
            >
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-[clamp(54px,7.6vw,96px)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
            {title}
          </h1>
          {description && (
            <p
              className="max-w-[480px] text-lg text-white/80"
              {...descriptionAttrs}
            >
              {description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={primaryHref}
              className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-white px-7 text-sm font-medium tracking-[0.02em] text-[#0a0a0a] transition-colors hover:bg-white/88"
            >
              <span {...primaryTextAttrs}>{primaryText}</span>
            </Link>
            {secondaryText && (
              <Link
                href={secondaryHref ?? "/about"}
                className="inline-flex h-12 items-center justify-center rounded-(--radius) border border-white/40 bg-transparent px-7 text-sm font-medium tracking-[0.02em] text-white transition-colors hover:border-white/70"
              >
                <span {...secondaryTextAttrs}>{secondaryText}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
