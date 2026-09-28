import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "~/lib/utils";

import { UmscHeading } from "./umsc-heading";
import { hasCustomImage } from "./umsc-image-fallback";
import { UmscLede } from "./umsc-lede";

type Props = {
  heading: string;
  headingFieldKey?: string;
  lede?: string;
  ledeFieldKey?: string;
  image?: string;
  imageAlt?: string;
  sectionAttrs?: Record<string, string>;
  /**
   * Rendered above the h1 — a back link on detail pages (event, blog post,
   * service). Optional; existing consumers pass nothing.
   */
  leading?: ReactNode;
  /**
   * Rendered under the lede — dates, locations, notices, a contact line.
   * Optional; existing consumers pass nothing.
   */
  children?: ReactNode;
  /**
   * Detail-page scale: long record titles (a post, an event, a service) sit
   * one step smaller than a page title so two-line names don't overwhelm the
   * band. Same face, case and tracking.
   */
  compact?: boolean;
};

/**
 * UmscPageHero — the interior-page black band: h1 + lede, optional right-side
 * image, gold hairline along the bottom edge. Used by every non-homepage page
 * hero (About, Shop, Contact, FAQ, generic pages, blog, events, videos,
 * donate, services, …).
 *
 * Width rhythm (baseline B1.7, parity PF25 decision 2026-09-28): the band
 * pads its inline edges with `--umsc-section-pad-x` — the same token
 * `UmscSection` uses — and the inner block is the bare `--umsc-container`
 * with no inset of its own, so the h1 starts on the exact left edge as every
 * section below it (80px at 1440). Never add horizontal padding to the inner
 * block; that moves the edge.
 */
export function UmscPageHero({
  heading,
  headingFieldKey,
  lede,
  ledeFieldKey,
  image,
  imageAlt,
  sectionAttrs,
  leading,
  children,
  compact = false,
}: Props) {
  const showImage = hasCustomImage(image);

  return (
    <section
      aria-label="Page introduction"
      {...sectionAttrs}
      className="umsc-page-hero relative border-b-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)]"
      style={{ paddingInline: "var(--umsc-section-pad-x)" }}
    >
      <div
        className={cn(
          "mx-auto grid items-center gap-10 py-16 lg:py-24",
          showImage && "lg:grid-cols-[1.1fr_0.9fr]",
        )}
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <div className="min-w-0">
          {leading ? <div className="mb-6">{leading}</div> : null}
          <UmscHeading
            as="h1"
            fieldKey={headingFieldKey}
            className={cn(
              "break-words text-[var(--umsc-cream-on-black)]",
              compact && "text-[clamp(34px,4.4vw,60px)] leading-[1.08]",
            )}
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede onBlack fieldKey={ledeFieldKey} className="mt-5">
              {lede}
            </UmscLede>
          )}
          {children}
        </div>
        {showImage && (
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden border border-[var(--umsc-line-gold)] lg:block">
            <Image
              src={image!}
              alt={imageAlt ?? ""}
              fill
              className="object-cover"
              sizes="40vw"
            />
          </div>
        )}
      </div>
    </section>
  );
}
