import type { ReactNode } from "react";
import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";

import { hasOliveImage, OliveReveal } from "../shared";
import { OLIVE_PAGE_EDGE_MAX, OlivePageSection } from "./olive-page-section";

type Props = {
  /** The page's only h1. */
  title: string;
  /** Full field key for `title`, when it is exactly one field's value. */
  titleFieldKey?: string;
  /** One short paragraph under the title. Hidden when blank. */
  intro?: string | null;
  introFieldKey?: string;
  /**
   * Cover photo. When it is a real image (not blank, not `/placeholder.svg`)
   * the band becomes the photo variant: full-bleed photo, title on a white
   * card that sits on the page edge.
   */
  image?: string | null;
  /** Cover video (MP4). Wins over `image`; same card layout. */
  video?: string | null;
  /** Row above the title — a breadcrumb or back link. */
  leading?: ReactNode;
  /** Rows under the intro — event meta, a status line. */
  children?: ReactNode;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
  /** Accessible name for the band's `<section>`. Defaults to the title. */
  ariaLabel?: string;
};

/**
 * OlivePageBand — the title band of olive's generic page, shared by every
 * page built on that base (generic CMS pages, events, event, videos, donate,
 * FAQ, services index, service detail).
 *
 * Two variants, the same two the generic page has always had:
 * - **Plain** (no cover): a white band, the h1 in `olive-h1` (Josefin Sans
 *   300) with an optional `olive-caption` intro, on the page edge. The body
 *   below usually continues it with `<OlivePageSection flush>`.
 * - **Cover**: a full-bleed photo (or muted loop video) with the title printed
 *   on a white `olive-card`. The card sits on the page edge — 120px at 1440,
 *   16px at 390 — not in the photo's padded corner, so it lines up with the
 *   body text below it (PF12 / baseline B1.7). The band grows with its card
 *   (flow layout, not absolute), so a long title never clips.
 *
 * No overline/kicker slot on purpose: olive's heading block carries its own
 * weight (see `OliveSectionHeading`); `leading` is for navigation only.
 *
 * Server-safe (no hooks); the reveal is the client `OliveReveal` wrapper.
 */
export function OlivePageBand({
  title,
  titleFieldKey,
  intro,
  introFieldKey,
  image,
  video,
  leading,
  children,
  sectionAttrs,
  ariaLabel,
}: Props) {
  const hasVideo = typeof video === "string" && video.trim().length > 0;
  const hasCover = hasVideo || hasOliveImage(image);
  const introText = intro?.trim() ? intro : null;

  const heading = (
    <h1
      className="olive-h1"
      style={{ overflowWrap: "anywhere" }}
      {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
    >
      {title}
    </h1>
  );

  const introNode = introText ? (
    <p
      className="olive-caption"
      style={{ marginTop: "0.75rem", maxWidth: "60ch", whiteSpace: "pre-line" }}
      {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
    >
      {introText}
    </p>
  ) : null;

  const leadingNode = leading ? (
    <div style={{ marginBottom: "1.25rem" }}>{leading}</div>
  ) : null;

  if (!hasCover) {
    return (
      <OlivePageSection
        aria-label={ariaLabel ?? (title || undefined)}
        sectionAttrs={sectionAttrs}
      >
        <OliveReveal>
          {leadingNode}
          {heading}
          {introNode}
          {children}
        </OliveReveal>
      </OlivePageSection>
    );
  }

  return (
    <section
      aria-label={ariaLabel ?? (title || undefined)}
      {...sectionAttrs}
      className="relative flex w-full items-end overflow-hidden"
      style={{
        minHeight: "clamp(280px, 36vw, 420px)",
        paddingTop: "clamp(120px, 18vw, 220px)",
        paddingBottom: "clamp(16px, 3vw, 32px)",
        paddingInline: "var(--olive-section-pad-x)",
        backgroundColor: "var(--olive-paper)",
      }}
    >
      {hasVideo ? (
        // The pause control moves to the top-right corner so the title card
        // (bottom-left, full width at 390) never covers it.
        <ServiceHeroVideo src={video} buttonClassName="!top-4 !bottom-auto" />
      ) : (
        <Image
          src={image!}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}

      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: OLIVE_PAGE_EDGE_MAX }}
      >
        <OliveReveal className="olive-card flex w-full max-w-[34rem] flex-col p-6">
          {leadingNode}
          {heading}
          {introNode}
          {children}
        </OliveReveal>
      </div>
    </section>
  );
}
