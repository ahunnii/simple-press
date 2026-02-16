"use client";

import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "~/components/ui/button";

export function PollenCallToAction({
  title,
  subtitle,
  description,
  buttonText,
  buttonLink,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
}) {
  return (
    <section id="contact" className="relative overflow-hidden py-24 md:py-32">
      <Image
        src={imageUrl}
        alt=""
        fill
        className="object-cover blur-sm brightness-75"
        sizes="100vw"
        priority={false}
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex min-h-[50vh] items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-6 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            {subtitle}
          </p>

          <h2 className="mb-6 text-4xl leading-tight font-bold text-balance text-white md:text-5xl lg:text-6xl">
            {title}
          </h2>

          <p className="mx-auto mb-10 max-w-xl leading-relaxed text-white md:text-lg">
            {description}
          </p>

          <Link
            href={buttonLink}
            className={buttonVariants({
              size: "lg",
              className:
                "rounded-full bg-[#5e8b4a] px-8 py-6 text-base font-medium text-white shadow-lg hover:bg-[#4d7a3d]",
            })}
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
