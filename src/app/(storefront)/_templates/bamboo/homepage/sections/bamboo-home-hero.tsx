import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { BambooGlyph } from "../../shared/bamboo-glyph";

/**
 * Hero — the "living scene". Ported element-for-element from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` (lines
 * ~743-819): an edge-frame of culms bleeding off both page edges, one
 * grounded still-life cluster anchored lower-right, up to 7 drifting leaves,
 * and a scroll-cue leaf. Every ambient loop (`bamboo-pop-in`/`bamboo-sway`/
 * `bamboo-bob`/`bamboo-drift`) is pure CSS driven by the per-element custom
 * properties below — no JS, no IntersectionObserver (the hero is always the
 * first thing in view).
 *
 * Per-element base vars are set via inline `style` (works everywhere, same
 * pattern `shared/bamboo-edge.tsx` uses for its leaf overlays). The handful
 * of elements that need DIFFERENT values at ≤900px (the mockup's
 * `.h-stalk-r`/`.c-pack`/`.c-roll-b`/`.c-pot`/`.drift.d1-3` overrides) carry
 * an additional semantic marker class instead — `bamboo-h-stalk-r`,
 * `bamboo-c-pack`, `bamboo-c-roll-b`, `bamboo-c-pot`, `bamboo-d1`,
 * `bamboo-d2`, `bamboo-d3` — whose `!important` overrides live in ONE
 * `@media (max-width: 900px)` block in the `.bamboo` region of
 * `src/styles/globals.css`, ported verbatim from the mockup's own mobile
 * block (CSS ~line 393-403). An inline style custom property always beats a
 * Tailwind arbitrary-property class regardless of viewport, and Tailwind
 * never generates CSS for a class string built at runtime anyway — which is
 * why the previous `cssVars()`-composed approach silently produced no CSS at
 * all. `!important` in a real, authored media-query rule is what actually
 * wins over the inline base value at that breakpoint.
 *
 * Elements dropped entirely on mobile use the `.bamboo-m-hide` utility
 * (globals.css), not Tailwind's `max-[900px]:hidden` — `.bamboo-el`/
 * `.bamboo-drift` set `display: block` as plain, unlayered CSS, which
 * out-specifies any `@layer utilities` rule (Tailwind's `hidden` included)
 * regardless of source order or breakpoint.
 */

type HeroProps = {
  sectionAttrs: Record<string, string>;
  titleFieldKey: string;
  title: string;
  taglineFieldKey: string;
  tagline: string;
  descriptionFieldKey: string;
  description: string;
  primaryTextFieldKey: string;
  primaryText: string;
  primaryLink: string;
  secondaryTextFieldKey: string;
  secondaryText: string;
  secondaryLink: string;
  heroImage: string;
  heroImageLabel: string;
};

export function BambooHomeHero({
  sectionAttrs,
  titleFieldKey,
  title,
  taglineFieldKey,
  tagline,
  descriptionFieldKey,
  description,
  primaryTextFieldKey,
  primaryText,
  primaryLink,
  secondaryTextFieldKey,
  secondaryText,
  secondaryLink,
  heroImage,
  heroImageLabel,
}: HeroProps) {
  const hasHeroPhoto =
    heroImage.trim() !== "" && heroImage !== "/placeholder.svg";

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-hero-h"
      className="relative flex min-h-[min(92vh,900px)] items-center overflow-hidden bg-[var(--bamboo-sage)] pt-[124px] pb-[150px] max-[900px]:min-h-[min(86vh,760px)] max-[900px]:items-start max-[900px]:pt-14 max-[900px]:pb-10"
      style={{ marginTop: "calc(var(--bamboo-header-offset) * -1)" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* edge-frame culms, bleeding off the page edges */}
        <span
          className="bamboo-el bamboo-el--b bamboo-m-hide"
          style={
            {
              "--w": "180px",
              "--l": "-3.6%",
              "--b": "-190px",
              "--d": ".30s",
            } as CSSProperties
          }
        >
          <span
            className="bamboo-tilt"
            style={{ "--rz": "0deg" } as CSSProperties}
          >
            <span
              className="bamboo-sway"
              style={
                {
                  "--dur": "8.4s",
                  "--dl": "-3.1s",
                  "--a1": "-.55deg",
                  "--a2": ".6deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-culm-run" />
            </span>
          </span>
        </span>
        <span
          className="bamboo-el bamboo-el--b bamboo-m-hide"
          style={
            {
              "--w": "118px",
              "--l": "2.4%",
              "--b": "-124px",
              "--d": ".44s",
            } as CSSProperties
          }
        >
          <span
            className="bamboo-tilt"
            style={{ "--rz": "4deg" } as CSSProperties}
          >
            <span
              className="bamboo-sway"
              style={
                {
                  "--dur": "9.6s",
                  "--dl": "-5.9s",
                  "--a1": "-1.7deg",
                  "--a2": "1.1deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-culm-green" />
            </span>
          </span>
        </span>

        <span
          className="bamboo-el bamboo-el--b bamboo-h-stalk-r"
          style={
            {
              "--w": "278px",
              "--l": "88%",
              "--b": "-58px",
              "--d": ".10s",
            } as CSSProperties
          }
        >
          <span
            className="bamboo-tilt"
            style={{ "--rz": "-5deg" } as CSSProperties}
          >
            <span
              className="bamboo-sway"
              style={
                {
                  "--dur": "7.4s",
                  "--dl": "-1.2s",
                  "--a1": "-1.4deg",
                  "--a2": "1.1deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-culm-tan" />
            </span>
          </span>
        </span>
        <span
          className="bamboo-el bamboo-el--b bamboo-m-hide"
          style={
            {
              "--w": "168px",
              "--l": "84.5%",
              "--b": "-118px",
              "--d": ".20s",
            } as CSSProperties
          }
        >
          <span
            className="bamboo-tilt"
            style={{ "--rz": "5deg" } as CSSProperties}
          >
            <span
              className="bamboo-sway"
              style={
                {
                  "--dur": "9.2s",
                  "--dl": "-5.4s",
                  "--a1": "-1.5deg",
                  "--a2": "1.3deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-culm-green" />
            </span>
          </span>
        </span>

        {/* the still-life: one cluster, one ground plane, anchored lower-right */}
        <div className="absolute right-[1.5%] bottom-[44px] aspect-[860/430] w-[min(60%,860px)] max-[900px]:right-[2%] max-[900px]:bottom-[22px] max-[900px]:aspect-[372/222] max-[900px]:w-[min(96%,372px)]">
          <span
            className="bamboo-el bamboo-el--b bamboo-c-roll-b"
            style={
              {
                "--w": "18%",
                "--l": "58%",
                "--b": "6%",
                "--d": ".50s",
              } as CSSProperties
            }
          >
            <i
              className="bamboo-shd"
              style={
                {
                  "--sw": "88%",
                  "--sh": "11%",
                  "--sx": "8px",
                  "--sb": "-4%",
                } as CSSProperties
              }
            />
            <span
              className="bamboo-bob"
              style={
                {
                  "--dur": "6.2s",
                  "--dl": "-4.1s",
                  "--amp": "5px",
                  "--rot": "-1.6deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-roll-front" />
            </span>
          </span>

          <span
            className="bamboo-el bamboo-el--b bamboo-c-pot"
            style={
              {
                "--w": "18%",
                "--l": "75%",
                "--b": "5%",
                "--d": ".66s",
              } as CSSProperties
            }
          >
            <i
              className="bamboo-shd"
              style={
                { "--sw": "96%", "--sh": "11%", "--sx": "6px" } as CSSProperties
              }
            />
            <span
              className="bamboo-sway"
              style={
                {
                  "--dur": "6.8s",
                  "--dl": "-2.6s",
                  "--a1": "-1deg",
                  "--a2": "1.2deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-pot" />
            </span>
          </span>

          {/* HER PACK — focal, front, largest */}
          <span
            className="bamboo-el bamboo-el--b bamboo-c-pack"
            style={
              {
                "--w": "38%",
                "--l": "22%",
                "--b": "1%",
                "--d": ".42s",
              } as CSSProperties
            }
          >
            <i
              className="bamboo-shd"
              style={
                {
                  "--sw": "90%",
                  "--sh": "11%",
                  "--sx": "10px",
                  "--sb": "-4%",
                } as CSSProperties
              }
            />
            <span
              className="bamboo-bob"
              style={
                {
                  "--dur": "7.4s",
                  "--dl": "-2.2s",
                  "--amp": "4px",
                  "--rot": ".5deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-pack" />
            </span>
          </span>

          <span
            className="bamboo-el bamboo-el--b bamboo-m-hide"
            style={
              {
                "--w": "14%",
                "--l": "6%",
                "--b": "-1%",
                "--d": ".56s",
              } as CSSProperties
            }
          >
            <i
              className="bamboo-shd"
              style={
                { "--sw": "94%", "--sh": "16%", "--sb": "-7%" } as CSSProperties
              }
            />
            <span
              className="bamboo-bob"
              style={
                {
                  "--dur": "5.1s",
                  "--dl": "-1.1s",
                  "--amp": "5px",
                  "--rot": "1.6deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-roll-top" />
            </span>
          </span>

          <span
            className="bamboo-el bamboo-el--b bamboo-m-hide"
            style={
              {
                "--w": "12%",
                "--l": "14%",
                "--b": "-3%",
                "--d": ".74s",
              } as CSSProperties
            }
          >
            <span
              className="bamboo-tilt"
              style={{ "--rz": "-8deg" } as CSSProperties}
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "7.9s",
                    "--dl": "-4.8s",
                    "--a1": "-2deg",
                    "--a2": "2deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-sprig" />
              </span>
            </span>
          </span>
        </div>

        {/* leaves drifting through the gap between the copy and the cluster */}
        <span
          className="bamboo-drift bamboo-d1"
          style={
            {
              "--l": "44%",
              "--t": "7%",
              "--w": "34px",
              "--dur": "15s",
              "--dl": "-2s",
              "--dx": "120px",
              "--dy": "470px",
              "--dr": "180deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf" />
        </span>
        <span
          className="bamboo-drift bamboo-d2"
          style={
            {
              "--l": "57%",
              "--t": "5%",
              "--w": "27px",
              "--dur": "19s",
              "--dl": "-9s",
              "--dx": "-80px",
              "--dy": "510px",
              "--dr": "-150deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf-d" />
        </span>
        <span
          className="bamboo-drift bamboo-d3"
          style={
            {
              "--l": "49%",
              "--t": "20%",
              "--w": "25px",
              "--dur": "17s",
              "--dl": "-5s",
              "--dx": "90px",
              "--dy": "420px",
              "--dr": "200deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf-l" />
        </span>
        <span
          className="bamboo-drift bamboo-m-hide"
          style={
            {
              "--l": "67%",
              "--t": "9%",
              "--w": "27px",
              "--dur": "14s",
              "--dl": "-11s",
              "--dx": "-70px",
              "--dy": "440px",
              "--dr": "150deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf" />
        </span>
        <span
          className="bamboo-drift bamboo-m-hide"
          style={
            {
              "--l": "44%",
              "--t": "36%",
              "--w": "26px",
              "--dur": "20s",
              "--dl": "-6s",
              "--dx": "110px",
              "--dy": "330px",
              "--dr": "-190deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf-d" />
        </span>
        <span
          className="bamboo-drift bamboo-m-hide"
          style={
            {
              "--l": "74%",
              "--t": "4%",
              "--w": "25px",
              "--dur": "18s",
              "--dl": "-13s",
              "--dx": "80px",
              "--dy": "380px",
              "--dr": "160deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf-l" />
        </span>
        <span
          className="bamboo-drift bamboo-m-hide"
          style={
            {
              "--l": "57.5%",
              "--t": "43%",
              "--w": "21px",
              "--dur": "16s",
              "--dl": "-3s",
              "--dx": "-60px",
              "--dy": "280px",
              "--dr": "-160deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf" />
        </span>
      </div>

      {hasHeroPhoto && (
        // Outer div carries the absolute placement — `.bamboo-photo-card`
        // itself sets `position: relative` at higher specificity than a
        // plain Tailwind `.absolute`, so positioning must live one level up.
        <div className="absolute top-[32%] left-[38%] z-1 w-[clamp(140px,15vw,200px)] max-[900px]:hidden">
          <figure className="bamboo-photo-card -rotate-[4deg]">
            <Image
              src={heroImage}
              alt={heroImageLabel}
              width={200}
              height={200}
              className="aspect-square object-cover"
            />
          </figure>
        </div>
      )}

      <div className="relative z-2 mx-auto w-[min(1200px,calc(100%-48px))]">
        <div className="max-w-[min(600px,48vw)] max-[900px]:max-w-none">
          <h1
            id="bamboo-hero-h"
            {...fieldAttr(titleFieldKey)}
            className="font-heading text-[clamp(2.6rem,5.5vw,4.6rem)] leading-[1.08] font-bold tracking-[-.028em] text-[var(--bamboo-pine)]"
          >
            {title}
          </h1>
          <p
            {...fieldAttr(descriptionFieldKey)}
            className="mt-[22px] max-w-[34ch] text-[1.1rem] leading-[1.62] text-[var(--bamboo-ink)] max-[900px]:max-w-[31ch]"
          >
            {description}
          </p>
          <div className="mt-[34px] flex flex-wrap items-center gap-3.5">
            <Link href={primaryLink} className="bamboo-btn bamboo-btn-primary">
              <span {...fieldAttr(primaryTextFieldKey)}>{primaryText}</span>
            </Link>
            <Link href={secondaryLink} className="bamboo-btn bamboo-btn-ghost">
              <span {...fieldAttr(secondaryTextFieldKey)}>{secondaryText}</span>
            </Link>
          </div>
          <p
            {...fieldAttr(taglineFieldKey)}
            className="mt-[30px] mb-1.5 max-w-[44ch] text-[.86rem] font-medium tracking-[.09em] text-[var(--bamboo-pine)] uppercase opacity-90"
          >
            {tagline}
          </p>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[41%] z-2 w-8 max-[900px]:left-[38%]"
        style={{ animation: "bamboo-cue 4s ease-in-out infinite" }}
      >
        <BambooGlyph id="s-leaf-d" />
      </span>
    </section>
  );
}
