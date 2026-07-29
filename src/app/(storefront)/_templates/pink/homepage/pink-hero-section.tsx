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
      className="pink-dark relative flex flex-col overflow-hidden"
      style={{ background: "var(--pink-ink)" }}
      {...sectionGroupAttr("homepage", "hero")}
    >
      {/* Background image + scrims */}
      <div aria-hidden="true" className="absolute inset-0">
        {/* No hero image set → the scrims + drifting glows carry the band on
            their own. A light placeholder would show through as a grey
            watermark across the darkest part of the page. */}
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--pink-ink) 97%, transparent) 0%, color-mix(in srgb, var(--pink-ink) 50%, transparent) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--pink-ink) 80%, transparent) 0%, color-mix(in srgb, var(--pink-ink) 25%, transparent) 40%, color-mix(in srgb, var(--pink-ink) 35%, transparent) 60%, color-mix(in srgb, var(--pink-ink) 85%, transparent) 100%)",
          }}
        />
      </div>

      {/* Drifting glows */}
      <div
        aria-hidden="true"
        className="pink-anim-drift pointer-events-none absolute -top-52 -left-52 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--pink-glow-rose), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pink-anim-drift-slow pointer-events-none absolute -right-40 -bottom-40 h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--pink-glow-blush), transparent 70%)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col px-5 pt-32 pb-10 md:px-10 md:pt-44">
        <div className="flex items-center gap-4">
          <PinkRule tone="dark" width={44} />
          <p className="text-[13px] font-medium tracking-[.14em] uppercase">
            <span style={{ color: "var(--pink-ink-body)" }} {...fieldAttr("pink.homepage.hero-kicker")}>
              {kicker}
            </span>
            {kickerTrailing && (
              <>
                {" "}
                <span
                  style={{ color: "var(--pink-ink-muted)" }}
                  {...fieldAttr("pink.homepage.hero-kicker-trailing")}
                >
                  {kickerTrailing}
                </span>
              </>
            )}
          </p>
        </div>

        <h1
          className="pink-display mt-6 max-w-[16ch] text-[clamp(50px,7.8vw,132px)] leading-[0.96] font-semibold tracking-[-0.035em]"
          style={{ color: "var(--pink-paper)" }}
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
              style={{ animationDelay: ".26s", color: "var(--pink-blush)" }}
              {...fieldAttr("pink.homepage.hero-heading-line-2")}
            >
              {headingLine2}
            </span>
          </span>
        </h1>

        {body && (
          <p
            className="pink-anim-fade mt-6 max-w-[44ch] text-[19px] leading-[1.7]"
            style={{ color: "var(--pink-ink-body)", animationDelay: ".4s" }}
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
              style={{ backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
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
