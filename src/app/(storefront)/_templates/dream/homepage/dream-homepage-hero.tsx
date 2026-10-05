import type { CSSProperties } from "react";

import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { DreamBalloons } from "../shared/dream-balloons";
import { DreamButton } from "../shared/dream-button";
import { DreamClouds } from "../shared/dream-clouds";
import { DreamH1 } from "../shared/dream-h1";
import { DreamPhoto } from "../shared/dream-photo";

/**
 * One frame on the hero shelf (one row of `dream.homepage.hero-shelf`). Its
 * frame shape comes from its position — see `SHELF_ASPECTS`.
 */
type HeroShelfPhoto = {
  src: string;
  alt: string;
  caption: string;
};

type HeroField = {
  heading: string;
  accent: string;
  headingAfter: string;
  lede: string;
  ctaLabel: string;
  ctaUrl: string;
  /** B2.5: false when `ctaUrl` points at a flag-disabled route — hide the button, never swap its destination. */
  ctaVisible: boolean;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  /** B2.5: same gating as `ctaVisible`, for the secondary button. */
  ctaSecondaryVisible: boolean;
  /** The owner's shelf photos (3–12), left to right — see `SHELF_ASPECTS`. */
  shelf: HeroShelfPhoto[];
};

type DreamHomepageHeroProps = {
  logoUrl: string;
  logoAlt: string;
  fields: HeroField;
};

/**
 * Frame shape per shelf position (mixed aspects are what keep the strip from
 * reading as a filmstrip of identical tiles) — wide, tall, square, wide,
 * tall, wide. Authored in the template, not editable: an owner picks the
 * photos, the composition keeps its rhythm. The pattern repeats
 * (`i % SHELF_ASPECTS.length`) for any number of photos.
 */
const SHELF_ASPECTS = ["3 / 2", "4 / 5", "1 / 1", "3 / 2", "4 / 5", "3 / 2"];

/**
 * The marquee needs at least this many frames per copy to be wider than the
 * viewport, or a blank gap drifts in before the loop restarts. Eight frames
 * at the 200px desktop shelf height is ~2,000px — enough for a 1920px screen
 * (the old fixed six were ~1,530px, which gapped on wide screens).
 */
const MIN_LOOP_FRAMES = 8;

/**
 * The template's one authored moment (design.md "Motion"): a living sky
 * behind the business logo, with the protected center stack (logo, headline,
 * lede, CTAs) on its veil and a full-width photo shelf resting on the hero
 * floor beneath it.
 *
 * The shelf shows the owner's photos (`dream.homepage.hero-shelf`, 3–12
 * rows). It is a transform-only marquee: the drifting set (`loop`) is the
 * owner's rows cycled until there are at least `MIN_LOOP_FRAMES` frames, and
 * it is rendered TWICE inside `.dream-hero-shelf-track`. The track drifts to
 * `translateX(-50%)` — exactly one copy's width — so the loop restarts on a
 * frame identical to the one it left, with no visible jump.
 *
 * In the first copy, only the owner's own rows carry visual-editor hooks
 * (`listItemAttr`) and real alt text. Any padding frames after them (needed
 * when the owner has fewer than `MIN_LOOP_FRAMES` photos) are `aria-hidden` with `alt=""`,
 * no hooks, and `.is-dup`, so they disappear on mobile where the shelf is a
 * plain scrollable row of just the owner's photos. The second copy is
 * likewise decoration only: `aria-hidden`, `alt=""`, no hooks, and
 * `display: none` below 960px.
 *
 * Drift speed stays constant per frame: the track's `--dream-shelf-count`
 * (the loop length) scales the animation duration in `globals.css` at 10s
 * per frame (the original six-frame shelf took 60s).
 */
export function DreamHomepageHero({
  logoUrl,
  logoAlt,
  fields: f,
}: DreamHomepageHeroProps) {
  const owned = f.shelf;
  const loop: HeroShelfPhoto[] = [];
  if (owned.length > 0) {
    while (loop.length < Math.max(owned.length, MIN_LOOP_FRAMES)) {
      loop.push(owned[loop.length % owned.length]!);
    }
  }

  const frame = (
    photo: HeroShelfPhoto,
    i: number,
    keyPrefix: string,
    decorative: boolean,
  ) => (
    <DreamPhoto
      key={`${keyPrefix}-${i}`}
      src={photo.src}
      alt={decorative ? "" : photo.alt}
      caption={photo.caption}
      aspect={SHELF_ASPECTS[i % SHELF_ASPECTS.length] ?? "3 / 2"}
      className={
        decorative ? "dream-hero-shelf-photo is-dup" : "dream-hero-shelf-photo"
      }
      fallbackTone="warm"
      attrs={
        decorative ? undefined : listItemAttr("dream.homepage.hero-shelf", i)
      }
    />
  );

  const trackStyle = {
    "--dream-shelf-count": loop.length,
  } as CSSProperties;

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
        {(f.ctaVisible || f.ctaSecondaryVisible) && (
          <div className="dream-hero-ctas">
            {f.ctaVisible && (
              <DreamButton href={f.ctaUrl} variant="primary">
                <span {...fieldAttr("dream.homepage.hero-cta-label")}>
                  {f.ctaLabel}
                </span>
              </DreamButton>
            )}
            {f.ctaSecondaryVisible && (
              <DreamButton href={f.ctaSecondaryUrl} variant="secondary">
                <span {...fieldAttr("dream.homepage.hero-cta-secondary-label")}>
                  {f.ctaSecondaryLabel}
                </span>
              </DreamButton>
            )}
          </div>
        )}
      </div>

      <div className="dream-hero-shelf" role="group" aria-label="Recent setups">
        <div className="dream-hero-shelf-track" style={trackStyle}>
          {owned.map((photo, i) => frame(photo, i, "photo", false))}
          {/* Padding frames (short lists) — desktop only, decoration. */}
          <div className="contents" aria-hidden="true">
            {loop
              .slice(owned.length)
              .map((photo, j) => frame(photo, owned.length + j, "pad", true))}
          </div>
          {/* The marquee's second half (desktop only) — decoration. */}
          <div className="contents" aria-hidden="true">
            {loop.map((photo, i) => frame(photo, i, "dup", true))}
          </div>
        </div>
      </div>
    </section>
  );
}
