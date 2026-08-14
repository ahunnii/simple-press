import Image from "next/image";
import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { hasCustomImage } from "../shared/pink-image-fallback";
import {
  PINK_WORDMARK_DEFAULTS,
  PinkWordmarkSvg,
} from "../shared/pink-wordmark-svg";

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
  /** The family-home photo, held in the upper region of the composition. */
  image: string;
  /** Wordmark, first half — set in `--pink-rose`. */
  wordmarkAccent: string;
  /** Wordmark, second half — set in `--pink-ink`. */
  wordmarkInk: string;
  /** Small tilted doll cutout, top-left corner. Decorative. */
  cornerDollLeft: string;
  /** Small tilted doll cutout, top-right corner. Decorative. */
  cornerDollRight: string;
  /** Left figure — a maker holding what she made. */
  maker1: string;
  maker1Alt: string;
  /** Center figure — the composition's anchor and the likely LCP element. */
  maker2: string;
  maker2Alt: string;
  /** Right figure — her panel's cut edge bleeds off the right of the canvas. */
  maker3: string;
  maker3Alt: string;
  /** Far-left figure — outside the trio, and desktop-only (rendered from 1024px up). */
  maker4: string;
  maker4Alt: string;
  /** Far-right figure — outside the trio, and desktop-only (rendered from 1024px up). */
  maker5: string;
  maker5Alt: string;
};

/**
 * Entrance order: h1 (.1s) → wordmark (.3s) → makers (centre first, so the
 * composition builds outward from its anchor, trio then the far pair) → band
 * (.6s) → corner dolls last, as the final flourish rather than something the
 * eye has to track.
 */
const MAKER_ENTER_DELAYS_S = {
  center: 0.45,
  left: 0.58,
  right: 0.71,
  farLeft: 0.84,
  farRight: 0.97,
};
const CORNER_ENTER_DELAYS_S = { left: 1.1, right: 1.2 };

/**
 * The homepage hero — the template's signature moment (design.md → Per-page
 * section concepts → Homepage → `homepage.hero`). Not hideable.
 *
 * **The people are the subject now.** v1 of this composition (shipped and
 * replaced the same day) put three doll cutouts across the front, on the
 * reasoning that the dolls are what the business sells. Wrong read: what the
 * business actually sells is a room where you make something, and what a
 * first-time visitor needs to see is somebody standing there holding the thing
 * they made. So the foreground figures are makers with their own work in
 * their hands — bigger than the dolls ever were, and deliberately overlapping
 * the wordmark up to about half its height, because a poster where the
 * subjects crowd the type reads as a scene and a poster where they politely
 * clear it reads as a stock layout. The dolls did not lose the argument
 * entirely: two of them survive as small tilted mementos in the top corners.
 * A second pair of makers was added outside the original trio (2026-08-04) to
 * widen the crowd on desktop; they render from 1024px up only. That pair first
 * shipped at 640px and up, which meant a 768–1023px tablet had to fit five
 * figures into a phone-and-a-half of width and squished every one of them
 * (owner report 2026-08-05) — so tablets now keep the original trio too, and
 * the crowd is a desktop move.
 *
 * Which is why the figures are **content, not decoration** — each one carries
 * real alt text from an owner-editable field. The v1 doll layer was
 * `aria-hidden` and that was correct for cutouts of merchandise; it would be
 * plainly wrong for photographs of people.
 *
 * **The wordmark is the client's own letterforms** (`PinkWordmarkSvg`), traced
 * as geometry because the logo font has no license we can ship. It renders only
 * while both wordmark fields still hold their defaults — rename the shop and
 * the hero falls back to the live Fraunces text build below, which is kept
 * intact for exactly that reason.
 *
 * **White ground, warm photo.** v1 washed the house to 22% greyscale over a
 * pink panel and the whole hero went grey-mauve. v2 sits on plain
 * `--pink-paper` with the house at a much higher opacity in its natural colour,
 * masked so it fades out before the band — the house belongs to the upper
 * region, and the band seam wants clean white under it. Contrast for the copy
 * is not bought by dimming the photo (that flattens the whole page); it is
 * bought by `.pink-hero-copy-scrim`, a paper-coloured radial that sits under
 * the kicker and H1 only.
 *
 * **The band still clips the figures on purpose.** Every cutout in this set —
 * dolls and makers alike — ends in a crop line somewhere below the waist,
 * because they were photographed hand-held. Sinking the lower ~15–22% behind
 * the band hides that edge while keeping the held work in view — the first
 * tuning pass sank them ~45% and buried the artwork, which defeated the whole
 * makers concept (QA 2026-08-04). The sink is a percentage translate on each
 * figure's own box, so the fraction hidden holds at any aspect ratio an owner
 * uploads.
 *
 * Entrance-only animation, no continuous motion: the 2026-07-31 audit measured
 * the old hero running 655 layout/style passes while completely idle (P3-2)
 * and deleted every looping keyframe in the template. `.pink-anim-rise`,
 * `.pink-anim-doll`, `.pink-anim-drop` and `.pink-anim-fade` are pure CSS,
 * gated behind `.pink-js` (so a JS-less page renders fully composed) and
 * `prefers-reduced-motion` at the stylesheet level.
 *
 * Pure server component — zero client JS in the template's signature moment.
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
  wordmarkAccent,
  wordmarkInk,
  cornerDollLeft,
  cornerDollRight,
  maker1,
  maker1Alt,
  maker2,
  maker2Alt,
  maker3,
  maker3Alt,
  maker4,
  maker4Alt,
  maker5,
  maker5Alt,
}: Props) {
  // The traced mark spells one specific word. It is only honest while the
  // owner has not renamed the shop; the moment either half is edited we owe
  // them live text, not their predecessor's logo.
  const useSvg =
    wordmarkAccent === PINK_WORDMARK_DEFAULTS.accent &&
    wordmarkInk === PINK_WORDMARK_DEFAULTS.ink;

  return (
    <section
      aria-label="Hero"
      // Full-viewport hero, minus the sticky header that sits in flow above it:
      // at a plain `100svh` the band — the row that exists to carry the CTAs —
      // ended exactly one header-height below the fold at every desktop
      // viewport (QA 2026-08-04). `svh` rather than `vh` so mobile browser
      // chrome cannot overflow it. The three rows are `auto / 1fr / auto`: a
      // short viewport compresses the stage in the middle rather than pushing
      // the CTAs off-screen. Everything that overhangs — the sunk lower half of
      // each maker, the right figure's panel bleeding past the right edge, the
      // corner dolls hanging off the top — is cropped here.
      className="relative flex min-h-[calc(100svh-var(--pink-header-h))] flex-col overflow-hidden"
      style={{ background: "var(--pink-paper)" }}
      {...sectionGroupAttr("homepage", "hero")}
    >
      {/* ── Layer 1: the house ──
          Decorative in every state: the heading below already says where the
          work gets made, and naming the house again in alt text would only add
          noise to the announcement. An owner who has not uploaded a photo gets
          no layer at all — the hero is composed on plain paper and reads as
          designed, not as a hole. */}
      {hasCustomImage(image) && (
        <div className="pink-hero-photo" aria-hidden="true">
          <Image
            src={image}
            alt=""
            fill
            // `eager`, not `priority`: it should arrive with the page, but the
            // preload budget belongs to the center maker — the actual LCP
            // candidate — not to a 0.42-opacity backdrop (review 2026-08-04).
            loading="eager"
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="pink-hero-tint" aria-hidden="true" />
      {/* The contrast guarantee for the kicker and H1, independent of whatever
          photo is behind them. Kept as its own element rather than folded into
          the tint so the two can be tuned separately: the tint is a mood, this
          is a legibility floor. */}
      <div className="pink-hero-copy-scrim" aria-hidden="true" />

      {/* ── Row 1: the pitch ──
          `z-30` — above every figure layer: on a short viewport (landscape
          phone, split-screen desktop) the svh-sized makers can ride up into
          this row, and the copy must paint over them, not under. */}
      <div className="relative z-30 mx-auto w-full max-w-[1400px] px-5 pt-12 pb-4 text-center md:px-10 md:pt-16 md:pb-6">
        <p className="text-[13px] font-medium tracking-[.14em] uppercase">
          <span
            style={{ color: "var(--pink-ink)" }}
            {...fieldAttr("pink.homepage.hero-kicker")}
          >
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

        {/* The wordmark below is the big type now, so the H1 steps down to a
            standee-sized single line — it is still the real heading (the
            wordmark is `aria-hidden` decoration), it just no longer has to
            carry the visual weight. `leading-1.25` clears descenders inside
            the masked reveal; the old 0.98 was tuned for an all-caps slab. */}
        <h1
          className="pink-display mx-auto mt-5 max-w-[24ch] text-[clamp(1.625rem,2.6vw,2.375rem)] leading-[1.25] font-semibold tracking-[-0.02em] text-balance"
          style={{ color: "var(--pink-ink)" }}
        >
          <span className="block overflow-hidden">
            <span
              className="pink-anim-rise block"
              style={{ animationDelay: ".1s" }}
            >
              <span {...fieldAttr("pink.homepage.hero-heading-line-1")}>
                {headingLine1}
              </span>{" "}
              <span
                style={{ color: "var(--pink-rose)" }}
                {...fieldAttr("pink.homepage.hero-heading-line-2")}
              >
                {headingLine2}
              </span>
            </span>
          </span>
        </h1>
      </div>

      {/* ── Row 2: the stage — wordmark behind, makers in front ──
          `min-h-0` lets this row absorb the slack (and give it back on a short
          viewport) instead of the copy or the band doing it. */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        {/* Decorative in both branches: it is the shop name set as a graphic,
            and the header wordmark plus the H1 already say it in the
            accessibility tree. The overflow mask is what the `.pink-anim-rise`
            translate reveals against, so it wraps either build. */}
        <div
          aria-hidden="true"
          className="pink-hero-wordmark-wrap w-full overflow-hidden"
        >
          <span
            className="pink-anim-rise block"
            style={{ animationDelay: ".3s" }}
          >
            {useSvg ? (
              <PinkWordmarkSvg />
            ) : (
              // The two halves stay separately editable so an owner whose name
              // splits differently can re-split it.
              <span className="pink-display pink-hero-wordmark">
                <span
                  style={{ color: "var(--pink-rose)" }}
                  {...fieldAttr("pink.homepage.hero-wordmark-accent")}
                >
                  {wordmarkAccent}
                </span>
                <span
                  style={{ color: "var(--pink-ink)" }}
                  {...fieldAttr("pink.homepage.hero-wordmark-ink")}
                >
                  {wordmarkInk}
                </span>
              </span>
            )}
          </span>
        </div>

        {/* The makers overhang this row's bottom edge — which is exactly the
            band's top edge — and the band paints over them from a higher
            stacking context. NOT `aria-hidden`: these are photographs of people
            with their work, so each one announces itself. `pointer-events-none`
            keeps the rail from swallowing clicks meant for the copy above it.
            Every filled slot is rendered here at every width; CSS is what drops
            the outer pair below 1024px, so the trio a phone or tablet sees is
            the same three elements a desktop sees in the middle, and no
            breakpoint changes the reading order. An empty slot renders
            nothing: the full crowd is the designed state, fewer is a quieter
            one, and a placeholder rectangle standing in for a person would be
            worse than either. */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pink-hero-makers">
            {hasCustomImage(maker4) && (
              <div
                className="pink-hero-maker pink-hero-maker-farleft pink-anim-doll"
                style={{ animationDelay: `${MAKER_ENTER_DELAYS_S.farLeft}s` }}
              >
                <div className="pink-hero-maker-figure">
                  <Image
                    src={maker4}
                    alt={maker4Alt}
                    width={1229}
                    height={1400}
                    loading="eager"
                    className="h-full w-auto"
                  />
                </div>
              </div>
            )}
            {hasCustomImage(maker1) && (
              <div
                className="pink-hero-maker pink-hero-maker-left pink-anim-doll"
                style={{ animationDelay: `${MAKER_ENTER_DELAYS_S.left}s` }}
              >
                <div className="pink-hero-maker-figure">
                  <Image
                    src={maker1}
                    alt={maker1Alt}
                    width={927}
                    height={1400}
                    loading="eager"
                    className="h-full w-auto"
                  />
                </div>
              </div>
            )}
            {hasCustomImage(maker2) && (
              <div
                className="pink-hero-maker pink-hero-maker-center pink-anim-doll"
                style={{ animationDelay: `${MAKER_ENTER_DELAYS_S.center}s` }}
              >
                <div className="pink-hero-maker-figure">
                  <Image
                    src={maker2}
                    alt={maker2Alt}
                    width={762}
                    height={1400}
                    // The makers are the subject — the center one is the likely
                    // LCP element, so it preloads; the house behind it is
                    // decorative and must not be the only prioritized image.
                    // No `sizes`: this is a height-driven layout (the rail
                    // sizes off `svh`), so a width-based hint would be a lie.
                    // The intrinsic width/height still prevent CLS.
                    priority
                    className="h-full w-auto"
                  />
                </div>
              </div>
            )}
            {hasCustomImage(maker3) && (
              <div
                className="pink-hero-maker pink-hero-maker-right pink-anim-doll"
                style={{ animationDelay: `${MAKER_ENTER_DELAYS_S.right}s` }}
              >
                <div className="pink-hero-maker-figure">
                  <Image
                    src={maker3}
                    alt={maker3Alt}
                    width={995}
                    height={1400}
                    loading="eager"
                    className="h-full w-auto"
                  />
                </div>
              </div>
            )}
            {hasCustomImage(maker5) && (
              <div
                className="pink-hero-maker pink-hero-maker-farright pink-anim-doll"
                style={{ animationDelay: `${MAKER_ENTER_DELAYS_S.farRight}s` }}
              >
                <div className="pink-hero-maker-figure">
                  <Image
                    src={maker5}
                    alt={maker5Alt}
                    width={1139}
                    height={1400}
                    loading="eager"
                    className="h-full w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Corner mementos ──
          Above the stage, below the band and the copy (`z-[15]` vs `z-20` /
          `z-30`) — they hang off the section's edges and get cropped by it, so
          they must never paint over the kicker. Decorative: two dolls at
          thumbnail size are a garnish on a composition whose subject is already
          announced by every maker below. They render at every width now
          (2026-08-05) — a phone gets them hung mostly off the left and right
          edges, where the section's crop leaves only a sliver showing, and only
          a viewport both narrow AND short drops them in CSS. */}
      {(hasCustomImage(cornerDollLeft) || hasCustomImage(cornerDollRight)) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[15]"
        >
          {hasCustomImage(cornerDollLeft) && (
            <div
              className="pink-hero-corner-doll pink-hero-corner-doll-left pink-anim-drop"
              style={{ animationDelay: `${CORNER_ENTER_DELAYS_S.left}s` }}
            >
              <div className="pink-hero-corner-doll-figure">
                <Image
                  src={cornerDollLeft}
                  alt=""
                  width={638}
                  height={1200}
                  loading="lazy"
                  sizes="(min-width: 640px) 160px, 90px"
                  className="h-auto w-full"
                />
              </div>
            </div>
          )}
          {hasCustomImage(cornerDollRight) && (
            <div
              className="pink-hero-corner-doll pink-hero-corner-doll-right pink-anim-drop"
              style={{ animationDelay: `${CORNER_ENTER_DELAYS_S.right}s` }}
            >
              <div className="pink-hero-corner-doll-figure">
                <Image
                  src={cornerDollRight}
                  alt=""
                  width={605}
                  height={1200}
                  loading="lazy"
                  sizes="(min-width: 640px) 160px, 90px"
                  className="h-auto w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Row 3: the band — the only thing above the makers ── */}
      <div
        className="pink-hero-band pink-anim-fade relative z-20"
        style={{ animationDelay: ".6s" }}
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10">
          {body && (
            <p
              className="max-w-[44ch] text-[16px] leading-[1.7] text-pretty"
              style={{ color: "var(--pink-body)" }}
              {...fieldAttr("pink.homepage.hero-body")}
            >
              {body}
            </p>
          )}
          {(ctaPrimaryLabel || ctaSecondaryLabel) && (
            <div className="flex shrink-0 flex-wrap gap-3">
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
          )}
        </div>
      </div>
    </section>
  );
}
