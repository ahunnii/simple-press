import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamBalloons } from "../shared/dream-balloons";
import { DreamButton } from "../shared/dream-button";
import { DreamClouds } from "../shared/dream-clouds";
import { DreamH1 } from "../shared/dream-h1";
import { DreamPhoto } from "../shared/dream-photo";

type HeroField = {
  heading: string;
  accent: string;
  headingAfter: string;
  lede: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  leftCardTitle: string;
  leftCardBody: string;
  leftPhoto: string;
  leftPhotoAlt: string;
  leftPhotoCaption: string;
  leftPhotoSmall: string;
  leftPhotoSmallAlt: string;
  leftPhotoSmallCaption: string;
  rightCardTitle: string;
  rightCardBody: string;
  rightPhoto: string;
  rightPhotoAlt: string;
  rightPhotoCaption: string;
  rightPhotoSmall: string;
  rightPhotoSmallAlt: string;
  rightPhotoSmallCaption: string;
};

type DreamHomepageHeroProps = {
  logoUrl: string;
  logoAlt: string;
  fields: HeroField;
};

/**
 * The template's one authored moment (design.md "Motion"): a living sky
 * behind the business logo, with two orbit columns floating alongside the
 * protected center zone. `.dream-hero`/`.dream-hero-safe`/`.dream-hero-orbit*`
 * are phase-2 chrome CSS (absolute-positioned side columns collapsing away
 * below 1200px, center content rendering first in DOM order) — reused
 * as-is per this section's brief, not reinvented here.
 */
export function DreamHomepageHero({
  logoUrl,
  logoAlt,
  fields: f,
}: DreamHomepageHeroProps) {
  return (
    <section
      className="dream-hero"
      aria-label="Hero"
      {...sectionGroupAttr("homepage", "hero")}
    >
      <DreamClouds variant="hero" eager={2} />
      <DreamBalloons />

      <div className="dream-hero-orbit dream-hero-orbit--left dream-hero-lanes dream-hero-lanes--left">
        <div className="dream-hero-orbit-stack dream-hero-orbit-stack--left">
          <div className="dream-card">
            <p
              className="font-[family-name:var(--font-dream-display)] text-[22px] leading-tight text-[var(--dream-ink)] min-[1200px]:text-[26px]"
              {...fieldAttr("dream.homepage.hero-left-card-title")}
            >
              {f.leftCardTitle}
            </p>
            <p
              className="mt-2 text-[15px] text-[var(--dream-soft)]"
              {...fieldAttr("dream.homepage.hero-left-card-body")}
            >
              {f.leftCardBody}
            </p>
          </div>
          <DreamPhoto
            src={f.leftPhoto}
            alt={f.leftPhotoAlt}
            caption={f.leftPhotoCaption}
            captionFieldKey="dream.homepage.hero-left-photo-caption"
            aspect="4 / 3"
            className="w-full"
            fallbackTone="warm"
          />
          <DreamPhoto
            src={f.leftPhotoSmall}
            alt={f.leftPhotoSmallAlt}
            caption={f.leftPhotoSmallCaption}
            captionFieldKey="dream.homepage.hero-left-photo-small-caption"
            aspect="3 / 2"
            className="dream-hero-photo-sm"
            fallbackTone="warm"
          />
        </div>
      </div>

      <div className="dream-hero-safe">
        {/*
          Finish-review fold fix: the `.dream-hero-logo` chrome class's own
          desktop width (320px) is used as-is — a prior 380px inline
          override pushed both hero CTAs below the 1440×900 fold. 320px
          sits at the top of design.md's revised 300–320px range.
        */}
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
          Both buttons are direct children of `.dream-hero-safe` on purpose
          (no wrapping div): the phase-2 chrome CSS's entrance stagger
          targets `.dream-js .dream-hero-safe > .dream-btn` (a direct-child
          selector) — a wrapper here would silently skip both buttons' fade
          in. `.dream-hero-safe`'s own `flex-direction: column` (with
          per-child `margin-bottom` rhythm, not a uniform `gap` — see the
          finish-review fold fix in globals.css) center-stacks them, which
          still reads as "primary action directly under the lede, dead
          center" (design.md FIRST VIEWPORT).
        */}
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

      <div className="dream-hero-orbit dream-hero-orbit--right dream-hero-lanes dream-hero-lanes--right">
        <div className="dream-hero-orbit-stack dream-hero-orbit-stack--right">
          <DreamPhoto
            src={f.rightPhotoSmall}
            alt={f.rightPhotoSmallAlt}
            caption={f.rightPhotoSmallCaption}
            captionFieldKey="dream.homepage.hero-right-photo-small-caption"
            aspect="3 / 2"
            className="dream-hero-photo-sm"
            fallbackTone="warm"
          />
          <DreamPhoto
            src={f.rightPhoto}
            alt={f.rightPhotoAlt}
            caption={f.rightPhotoCaption}
            captionFieldKey="dream.homepage.hero-right-photo-caption"
            aspect="4 / 3"
            className="w-full"
            fallbackTone="warm"
          />
          <div className="dream-card">
            <p
              className="font-[family-name:var(--font-dream-display)] text-[22px] leading-tight text-[var(--dream-ink)] min-[1200px]:text-[26px]"
              {...fieldAttr("dream.homepage.hero-right-card-title")}
            >
              {f.rightCardTitle}
            </p>
            <p
              className="mt-2 text-[15px] text-[var(--dream-soft)]"
              {...fieldAttr("dream.homepage.hero-right-card-body")}
            >
              {f.rightCardBody}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
