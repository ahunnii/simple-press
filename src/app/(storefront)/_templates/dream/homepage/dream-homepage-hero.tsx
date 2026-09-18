import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamBalloons } from "../shared/dream-balloons";
import { DreamButton } from "../shared/dream-button";
import { DreamClouds } from "../shared/dream-clouds";
import { DreamH1 } from "../shared/dream-h1";
import { DreamPhoto } from "../shared/dream-photo";

/** One frame on the hero shelf. Its frame shape is fixed by `SHELF_ASPECTS`. */
type HeroShelfPhoto = {
  src: string;
  alt: string;
  caption: string;
  captionFieldKey: string;
};

type HeroField = {
  heading: string;
  accent: string;
  headingAfter: string;
  lede: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  /** Six photos, left to right — see `SHELF_ASPECTS` for each slot's shape. */
  shelf: HeroShelfPhoto[];
};

type DreamHomepageHeroProps = {
  logoUrl: string;
  logoAlt: string;
  fields: HeroField;
};

/**
 * Fixed frame shape per shelf slot (mixed aspects are what keep the strip
 * from reading as a filmstrip of identical tiles) — wide, tall, square,
 * wide, tall, wide. Authored in the template, not editable: an owner picks
 * the photo, the composition keeps its rhythm.
 */
const SHELF_ASPECTS = ["3 / 2", "4 / 5", "1 / 1", "3 / 2", "4 / 5", "3 / 2"];

/**
 * The template's one authored moment (design.md "Motion"): a living sky
 * behind the business logo, with the protected center stack (logo, headline,
 * lede, CTAs) on its veil and a full-width photo shelf resting on the hero
 * floor beneath it.
 *
 * The shelf is a transform-only marquee: the six frames are rendered TWICE
 * inside `.dream-hero-shelf-track`, and the track drifts to `translateX(-50%)`
 * — exactly one copy's width — so the loop restarts on a frame identical to
 * the one it left, with no visible jump. The second copy is decoration only:
 * it is `aria-hidden`, its images carry `alt=""`, and it passes NO
 * `captionFieldKey`, since a second visual-editor hotspot pointing at the
 * same field would be wrong. Below 960px the duplicates are `display: none`
 * and the shelf becomes a plain horizontally scrollable row.
 */
export function DreamHomepageHero({
  logoUrl,
  logoAlt,
  fields: f,
}: DreamHomepageHeroProps) {
  const renderShelf = (dup: boolean) =>
    f.shelf.map((photo, i) => (
      <DreamPhoto
        key={`${dup ? "dup" : "photo"}-${i}`}
        src={photo.src}
        alt={dup ? "" : photo.alt}
        caption={photo.caption}
        captionFieldKey={dup ? undefined : photo.captionFieldKey}
        aspect={SHELF_ASPECTS[i] ?? "3 / 2"}
        className={
          dup ? "dream-hero-shelf-photo is-dup" : "dream-hero-shelf-photo"
        }
        fallbackTone="warm"
      />
    ));

  return (
    <section
      className="dream-hero"
      aria-label="Hero"
      {...sectionGroupAttr("homepage", "hero")}
    >
      <DreamClouds variant="hero" eager={2} />
      <DreamBalloons />

      <div className="dream-hero-safe">
        <img
          src={logoUrl}
          alt={logoAlt}
          className="dream-hero-logo"
          decoding="async"
          fetchPriority="high"
        />
        <DreamH1
          accent={f.accent}
          fieldKey="dream.homepage.hero-heading"
          accentFieldKey="dream.homepage.hero-accent"
          after={f.headingAfter}
          afterFieldKey="dream.homepage.hero-heading-after"
        >
          {f.heading}
        </DreamH1>
        <p
          className="dream-hero-lede"
          {...fieldAttr("dream.homepage.hero-lede")}
        >
          {f.lede}
        </p>
        {/*
          The two buttons sit in their own row wrapper (design.md FIRST
          VIEWPORT: "primary action directly under the lede, dead center").
          The chrome CSS's entrance stagger targets
          `.dream-js .dream-hero-safe > .dream-hero-ctas` — the wrapper
          itself, not the buttons — so the row fades in as one.
        */}
        <div className="dream-hero-ctas">
          <DreamButton href={f.ctaUrl} variant="primary">
            <span {...fieldAttr("dream.homepage.hero-cta-label")}>
              {f.ctaLabel}
            </span>
          </DreamButton>
          <DreamButton href={f.ctaSecondaryUrl} variant="secondary">
            <span {...fieldAttr("dream.homepage.hero-cta-secondary-label")}>
              {f.ctaSecondaryLabel}
            </span>
          </DreamButton>
        </div>
      </div>

      <div className="dream-hero-shelf" role="group" aria-label="Recent setups">
        <div className="dream-hero-shelf-track">
          {renderShelf(false)}
          {/* The marquee's second half (desktop only) — decoration. */}
          <div className="contents" aria-hidden="true">
            {renderShelf(true)}
          </div>
        </div>
      </div>
    </section>
  );
}
