import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
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
};
export function PollenGeneralLayout({
  business,
  children,
  title,
  subtitle,
  imageUrl,
  showCTA = true,
  sectionAttrs,
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
          <Image
            src={!!imageUrl ? imageUrl : f["pollen.global.header-background"]!}
            alt=""
            fill
            className="object-cover object-right"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[#2a351f]/65" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
              {subtitle}
            </p>
            <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl">
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
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
