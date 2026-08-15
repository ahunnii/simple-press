import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { GenericImageRow } from "~/lib/template-fields";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

type Props = {
  sectionLabel?: string;
  sectionHeading?: string;
  buttonText?: string;
  buttonLink?: string;
  galleryItems?: GenericImageRow[];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function PollenHomepageGallery({
  sectionLabel,
  sectionHeading,
  buttonText,
  buttonLink,
  galleryItems,
  sectionAttrs,
}: Props) {
  return (
    <section
      id="gallery"
      className="bg-background py-20 md:py-32"
      {...sectionAttrs}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p
              className="text-primary mb-4 text-sm font-medium tracking-wider uppercase"
              {...fieldAttr("pollen.homepage.gallery-label")}
            >
              {sectionLabel}
            </p>
            <h2
              className="text-foreground text-3xl font-bold text-balance md:text-4xl"
              {...fieldAttr("pollen.homepage.gallery-heading")}
            >
              {sectionHeading}
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems?.map((item) => (
            <StaggerItem key={item.label}>
              <div className="group relative aspect-4/3 overflow-hidden rounded-xl">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/40" />
                <p className="absolute bottom-4 left-4 text-lg font-medium text-white drop-shadow-sm">
                  {item.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="flex justify-center">
          <Link
            href={buttonLink ?? "#!"}
            className={buttonVariants({
              size: "lg",
              className: "gap-2 bg-[#215935]! hover:bg-[#1a4729]!",
            })}
          >
            <span {...fieldAttr("pollen.homepage.gallery-button-text")}>
              {buttonText}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
