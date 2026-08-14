"use client";

import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { FadeIn } from "~/components/page-animations";

export function PollenCallToAction({
  title,
  subtitle,
  description,
  buttonText,
  buttonLink,
  imageUrl,
  sectionAttrs,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  return (
    <section
      className="relative mx-auto max-w-7xl overflow-hidden rounded-xl py-12 md:py-24"
      {...sectionAttrs}
    >
      <Image
        src={imageUrl ?? "/placeholder.svg"}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex min-h-[30vh] items-center justify-center px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="mb-6 text-sm font-medium tracking-wider text-[#A8D081] uppercase"
              {...fieldAttr("pollen.global.cta-subtitle")}
            >
              {subtitle}
            </p>

            <h2
              className="mb-6 text-4xl leading-tight font-bold text-balance text-white md:text-5xl lg:text-6xl"
              {...fieldAttr("pollen.global.cta-title")}
            >
              {title}
            </h2>

            <p
              className="mx-auto mb-10 max-w-xl leading-relaxed text-white md:text-lg"
              {...fieldAttr("pollen.global.cta-text")}
            >
              {description}
            </p>

            <Link
              href={buttonLink ?? "#!"}
              className={cn(
                buttonVariants({
                  size: "lg",
                  variant: "default",
                }),
                `rounded-full bg-[#215935] px-8 py-6 text-base font-medium text-white shadow-lg hover:bg-[#1a4729]!`,
              )}
              {...fieldAttr("pollen.global.cta-button-text")}
            >
              {buttonText}
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
