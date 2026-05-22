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
}: Props) {
  const bgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    <section className="relative h-[92vh] min-h-[620px] overflow-hidden bg-[#1a1a1a] text-white isolate">
      {/* Parallax background — oversized vertically so translateY never reveals a gap */}
      <div
        ref={bgRef}
        className="absolute inset-x-0 will-change-transform"
        style={{ top: "-10%", bottom: "-10%" }}
      >
        <Image
          src={imageUrl}
          alt={title}
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
        <div className="mx-auto max-w-[1440px] px-6 pb-24 flex flex-col gap-6 max-w-2xl">
          {eyebrow && (
            <span className="text-xs font-medium tracking-[0.14em] uppercase text-white/60">
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-[clamp(54px,7.6vw,96px)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-white/80 max-w-[480px]">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center h-12 px-7 bg-white text-[#0a0a0a] text-sm font-medium tracking-[0.02em] rounded-[var(--radius)] transition-colors hover:bg-white/88"
            >
              {primaryText}
            </Link>
            {secondaryText && (
              <Link
                href={secondaryHref ?? "/about"}
                className="inline-flex items-center justify-center h-12 px-7 bg-transparent text-white border border-white/40 text-sm font-medium tracking-[0.02em] rounded-[var(--radius)] transition-colors hover:border-white/70"
              >
                {secondaryText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
