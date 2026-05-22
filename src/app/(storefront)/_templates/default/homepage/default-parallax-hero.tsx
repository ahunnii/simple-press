"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  imageUrl: string;
  title: string;
  description?: string;
  primaryText: string;
  primaryHref: string;
  secondaryText?: string;
  secondaryHref?: string;
};

export function DefaultParallaxHero({
  imageUrl,
  title,
  description,
  primaryText,
  primaryHref,
  secondaryText,
  secondaryHref,
}: Props) {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${window.scrollY * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: "78vh", minHeight: "500px" }}
    >
      {/* Parallax background — oversized vertically so translateY never reveals a gap */}
      <div
        ref={bgRef}
        className="absolute inset-x-0 will-change-transform"
        style={{ top: "-15%", bottom: "-15%" }}
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Gradient overlay — heavier at the bottom where text sits */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Text — anchored ~25% up from the bottom, centered horizontally */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-[10%] text-center text-white">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-base opacity-85">{description}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={primaryHref}
            className="border border-white px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-80"
          >
            {primaryText}
          </Link>
          {secondaryText && (
            <Link
              href={secondaryHref ?? "/shop"}
              className="text-sm font-medium tracking-wide underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              {secondaryText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
