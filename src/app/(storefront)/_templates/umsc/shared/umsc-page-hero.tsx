import type { ReactNode } from "react";
import Image from "next/image";

import type { UmscHeroImageMode } from "./umsc-hero-fields";
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
  /**
   * Where `image` sits. `"side"` (default): a right-hand column on wide
   * screens, hidden below `lg`. `"background"`: fills the whole band behind
   * the text under a dark scrim, on every width. Ignored without an image —
   * the band is then plain black either way.
   */
  imageMode?: UmscHeroImageMode;
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
 * UmscPageHero — the interior-page black band: h1 + lede, an optional photo,
 * gold hairline along the bottom edge. Used by every non-homepage page hero
 * (About, Shop, Contact, FAQ, generic pages, blog, events, videos, donate,
 * services, …). Three looks, driven by `image` + `imageMode` (owner fields
 * via `umscHeroPhotoFields` / `resolveUmscHeroPhoto`):
 *
 * - no image → plain black band;
 * - image, `"side"` → right-hand 4:3 column from `lg` up (hidden on phones);
 * - image, `"background"` → `fill` + `priority` photo behind the whole band,
 *   a `--umsc-black` scrim (≥72% everywhere, heavier on the text side and the
 *   bottom — cream text clears AA at 6:1+ even over pure white) and taller
 *   padding; shown on phones too. Alt is decorative ("") unless the owner
 *   wrote one.
 *
 * The scrim layer sits after the content in the DOM (`isolate` + z-index do
 * the stacking), so the content block stays the band's first child.
 * `umsc-black-surface` gives focus rings the gold outline every black band
 * uses (FAQ's band relied on it before it moved onto this component).
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
  imageMode = "side",
  sectionAttrs,
  leading,
  children,
  compact = false,
}: Props) {
  const hasImage = hasCustomImage(image);
  const background = hasImage && imageMode === "background";
  const showImage = hasImage && !background;

  return (
    <section
      aria-label="Page introduction"
      {...sectionAttrs}
      className={cn(
        "umsc-page-hero umsc-black-surface relative border-b-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)]",
        background && "isolate overflow-hidden",
      )}
      style={{ paddingInline: "var(--umsc-section-pad-x)" }}
    >
      <div
        className={cn(
          "mx-auto grid items-center gap-10",
          background ? "relative z-10 py-24 lg:py-32" : "py-16 lg:py-24",
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
      {background && (
        <div className="absolute inset-0 z-0">
          <Image
            src={image!}
            alt={imageAlt?.trim() ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: [
                "linear-gradient(to top, color-mix(in srgb, var(--umsc-black) 55%, transparent), transparent 65%)",
                "linear-gradient(to right, color-mix(in srgb, var(--umsc-black) 90%, transparent), color-mix(in srgb, var(--umsc-black) 72%, transparent))",
              ].join(", "),
            }}
          />
        </div>
      )}
    </section>
  );
}
