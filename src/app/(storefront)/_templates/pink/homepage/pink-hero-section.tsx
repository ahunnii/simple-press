import Image from "next/image";
import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkRule } from "../shared/pink-rule";
import { PinkHeroStrip, type PinkHeroPanel } from "./pink-hero-strip";

type Props = {
  kicker: string;
  kickerTrailing: string;
  headingLine1: string;
  headingLine2: string;
  body: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
  image: string;
  panels: PinkHeroPanel[];
};

/**
 * The homepage hero — the template's signature moment (design.md → Per-page
 * section concepts → Homepage → `homepage.hero`). Not hideable.
 *
 * Server-rendered except for the 4-panel strip (`PinkHeroStrip`, client) —
 * the masked heading reveal, glow drift and ken-burns are all pure CSS
 * (`.pink-anim-*`), gated behind `.pink-js` + `prefers-reduced-motion` at
 * the stylesheet level, same as the rest of the template.
 */
export function PinkHeroSection({
  kicker,
  kickerTrailing,
  headingLine1,
  headingLine2,
  body,
  ctaPrimaryLabel,
  ctaPrimaryLink,
  ctaSecondaryLabel,
  ctaSecondaryLink,
  image,
  panels,
}: Props) {
  return (
    <section
      aria-label="Hero"
      // `min-height: 100svh` honours design.md's "full-viewport ink hero" spec,
      // which the previous content-height build did not — the band measured
      // anywhere from 72% to 104% of the viewport depending on window size and
      // copy length, and at 1440x900 the panel strip was clipped 121px below the
      // fold (audit 2026-07-31, P2-1). `svh` rather than `vh` so mobile browser
      // chrome cannot overflow it. The content block flexes and the strip
      // anchors to the bottom, so slack absorbs into the band instead of into a
      // fixed 40px gap.
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ background: "var(--pink-paper)" }}
      {...sectionGroupAttr("homepage", "hero")}
    >
      {/* Optional background image, washed back so ink type stays legible.
          The band is a light surface as of 2026-07-31 — the previous smoky
          ink scrims plus two drifting radial glows were the main source of the
          "grungy" read, and the glows were also the measured cause of the
          homepage's idle layout churn. */}
      {image ? (
        <div aria-hidden="true" className="absolute inset-0">
          <Image src={image} alt="" fill priority className="object-cover" sizes="100vw" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in srgb, var(--pink-paper) 96%, transparent) 0%, color-mix(in srgb, var(--pink-paper) 72%, transparent) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--pink-paper) 88%, transparent) 0%, color-mix(in srgb, var(--pink-paper) 62%, transparent) 45%, color-mix(in srgb, var(--pink-paper) 90%, transparent) 100%)",
            }}
          />
        </div>
      ) : null}

      {/* Content — flexes to fill the band, vertically centred */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-16 md:px-10 md:py-20">
        <div className="flex items-center gap-4">
          <PinkRule tone="paper" width={44} />
          <p className="text-[13px] font-medium tracking-[.14em] uppercase">
            <span style={{ color: "var(--pink-ink)" }} {...fieldAttr("pink.homepage.hero-kicker")}>
              {kicker}
            </span>
            {kickerTrailing && (
              <>
                {" "}
                <span
                  style={{ color: "var(--pink-muted)" }}
                  {...fieldAttr("pink.homepage.hero-kicker-trailing")}
                >
                  {kickerTrailing}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Ceiling lowered from 132px to 96px (audit 2026-07-31, P2-6). 132px only
            materialised above ~1700px viewport width — the width least likely to
            have been reviewed — and at that size the headline shouts rather than
            speaks, which is at odds with the "clean, upbeat, all ages" direction.
            The `vw` term is nudged 7.8 → 7.4 so the curve stays smooth into the
            new cap instead of clamping early on common laptop widths, and
            leading goes 0.96 → 0.98 because the tighter value was tuned for the
            132px setting and reads cramped at 96px. */}
        <h1
          className="pink-display mt-6 max-w-[16ch] text-[clamp(3.125rem,7.4vw,6rem)] leading-[0.98] font-semibold tracking-[-0.035em]"
          style={{ color: "var(--pink-ink)" }}
        >
          <span className="block overflow-hidden">
            <span
              className="pink-anim-rise block"
              style={{ animationDelay: ".1s" }}
              {...fieldAttr("pink.homepage.hero-heading-line-1")}
            >
              {headingLine1}
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              className="pink-anim-rise block"
              style={{ animationDelay: ".26s", color: "var(--pink-rose)" }}
              {...fieldAttr("pink.homepage.hero-heading-line-2")}
            >
              {headingLine2}
            </span>
          </span>
        </h1>

        {body && (
          <p
            className="pink-anim-fade mt-6 max-w-[44ch] text-[19px] leading-[1.7]"
            style={{ color: "var(--pink-body)", animationDelay: ".4s" }}
            {...fieldAttr("pink.homepage.hero-body")}
          >
            {body}
          </p>
        )}

        <div className="pink-anim-fade mt-8 flex flex-wrap gap-3" style={{ animationDelay: ".5s" }}>
          {ctaPrimaryLabel && (
            <Link
              href={ctaPrimaryLink}
              className="pink-btn pink-btn-lg pink-btn-solid"
              {...fieldAttr("pink.homepage.hero-cta-primary-label")}
            >
              {ctaPrimaryLabel}
            </Link>
          )}
          {ctaSecondaryLabel && (
            <Link
              href={ctaSecondaryLink}
              className="pink-btn pink-btn-lg pink-btn-ghost"
              {...fieldAttr("pink.homepage.hero-cta-secondary-label")}
            >
              {ctaSecondaryLabel}
            </Link>
          )}
        </div>
      </div>

      <PinkHeroStrip panels={panels} />
    </section>
  );
}
