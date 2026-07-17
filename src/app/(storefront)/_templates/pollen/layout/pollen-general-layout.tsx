import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenCallToAction } from "../shared/pollen-cta";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  showCTA?: boolean;
  /** Spread on the hero header <section> for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Template field key backing `title`, if it resolves from exactly one field (live-text patch). */
  titleFieldKey?: string;
  /** Template field key backing `subtitle`, if it resolves from exactly one field (live-text patch). */
  subtitleFieldKey?: string;
};
export function PollenGeneralLayout({
  business,
  children,
  title,
  subtitle,
  imageUrl,
  showCTA = true,
  sectionAttrs,
  titleFieldKey,
  subtitleFieldKey,
}: Props) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.global.header-background",
    "pollen.global.cta-title",
    "pollen.global.cta-subtitle",
    "pollen.global.cta-text",
    "pollen.global.cta-button-text",
    "pollen.global.cta-button-link",
    "pollen.global.cta-image",
  ]);

  return (
    <PageTransition>
      <div className="bg-background pt-24">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden py-24 pb-16 md:py-32"
          {...sectionAttrs}
        >
          <div
            className="absolute inset-0"
            {...sectionGroupAttr("global", "header")}
          >
            <Image
              src={
                !!imageUrl ? imageUrl : f["pollen.global.header-background"]!
              }
              alt=""
              fill
              className="object-cover object-right"
              sizes="100vw"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-[#2a351f]/65" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p
              className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase"
              {...(subtitleFieldKey ? fieldAttr(subtitleFieldKey) : {})}
            >
              {subtitle}
            </p>
            <h1
              className="text-5xl font-bold text-white md:text-6xl lg:text-7xl"
              {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
            >
              {title}
            </h1>
          </div>
        </section>

        {children}

        {showCTA && (
          <div className="py-16">
            <PollenCallToAction
              title={f["pollen.global.cta-title"]}
              subtitle={f["pollen.global.cta-subtitle"]}
              description={f["pollen.global.cta-text"]}
              buttonText={f["pollen.global.cta-button-text"]}
              buttonLink={f["pollen.global.cta-button-link"]}
              imageUrl={f["pollen.global.cta-image"]}
              sectionAttrs={sectionGroupAttr("global", "cta")}
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
