/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

import { DEFAULT_BAMBOO_HERO_BADGES } from ".";
import { resolveFields } from "..";
import { BambooLeafGlyph } from "../shared/bamboo-leaf-sprig";

type Props = { customFields: unknown; hasValueBand: boolean };

/**
 * Split editorial hero — copy left, photography right (stacked on mobile), in
 * two modes driven by `bamboo.homepage.hero-bg-image`:
 *
 * - **Unset (default):** flat cream split, the right column an arched portrait
 *   whose offset gold hairline echoes the nav emblem.
 * - **Set:** the photo goes full-bleed behind the whole section under a cream
 *   scrim, and the right column drops the arch for a free-floating
 *   object-contain cut-out.
 *
 * In BOTH modes the hanging emblem in the header overhangs the top of the page,
 * so the generous `pt-24 lg:pt-32` is load-bearing, not decoration — it is what
 * keeps the emblem clear of the kicker at every width from lg up.
 *
 * `hasValueBand` (does the value band actually render below, per the
 * homepage's own visibility + item-count gate) drives the bottom seam: when
 * true, the value band's composited hairline wave now rides directly over
 * this section's own photo/cream (see `bamboo-value-band-section.tsx`), so
 * the bottom fade-to-cream layer is skipped here — a second cream fade would
 * flatten the photo before the wave ever gets to it — and the grid's bottom
 * padding grows to clear the wave's overlap (`-mt-14 md:-mt-24` pulls the
 * band up into this section). When false, the section owns its own seam into
 * flat page-cream exactly as before.
 *
 * Added 2026-09-24: in BG mode, `bamboo.homepage.hero-show-full-photo` and
 * `bamboo.homepage.hero-wash-strength` let the merchant thin out (or, with
 * the toggle, fully remove) the cream wash so more of the photo shows behind
 * the copy. Both collapse to one 0-1 `washScale`, piped into the section as
 * the `--bam-hero-wash` custom property and multiplied into every wash alpha
 * stop — see the wash `<div>`'s own comment for the color-mix mechanics.
 * Thinning the wash below full strength also turns on a soft cream
 * text-shadow halo (lg+ only) on the copy column, since a thin wash alone
 * doesn't guarantee gold-on-photo contrast.
 */
export function BambooHeroSection({ customFields, hasValueBand }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.hero-bg-image",
    "bamboo.homepage.hero-bg-tint",
    "bamboo.homepage.hero-show-full-photo",
    "bamboo.homepage.hero-wash-strength",
    "bamboo.homepage.hero-image",
    "bamboo.homepage.hero-title",
    "bamboo.homepage.hero-title-accent",
    "bamboo.homepage.hero-tagline",
    "bamboo.homepage.hero-description",
    "bamboo.homepage.hero-primary-button-link",
    "bamboo.homepage.hero-primary-button-text",
    "bamboo.homepage.hero-secondary-button-link",
    "bamboo.homepage.hero-secondary-button-text",
  ]);

  const badges =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.hero-badges"),
      DEFAULT_BAMBOO_HERO_BADGES,
    ) ?? [];

  const tagline = f["bamboo.homepage.hero-tagline"] ?? "";
  const description = f["bamboo.homepage.hero-description"] ?? "";
  const secondaryText = f["bamboo.homepage.hero-secondary-button-text"] ?? "";
  const bgImage = f["bamboo.homepage.hero-bg-image"] ?? "";
  const hasBg = bgImage.length > 0;
  // The hex test is doing two jobs: it is the tint's off-switch AND its
  // injection guard — `tint` lands in an inline `style`, so anything that
  // isn't exactly `#rrggbb` must never reach it. And `resolveTemplateFields`
  // hands back a saved empty string verbatim (no defaultValue fallback), so a
  // merchant who cleared the hero image yields `""` while an untouched one
  // yields the `/placeholder.svg` default — both mean "no real hero image".
  const tint = f["bamboo.homepage.hero-bg-tint"] ?? "";
  const hasTint = hasBg && /^#[0-9a-fA-F]{6}$/.test(tint);
  // "Show full photo" is a plain on/off toggle, same reading as every other
  // bamboo boolean field: an absent/blank saved value falls back to the
  // literal default ("false") before the comparison, so only an explicit
  // "true" flips it on.
  const showFullPhoto =
    ((f["bamboo.homepage.hero-show-full-photo"] ?? "").trim() || "false") !==
    "false";
  // Wash strength is merchant-typed free text funneled through a number
  // field, so it gets the defensive treatment: trim, `Number()`, clamp to
  // 0-100, and fall back to the standard-look default on anything that
  // doesn't parse (NaN or an explicitly cleared "").
  const washStrengthRaw = (
    f["bamboo.homepage.hero-wash-strength"] ?? ""
  ).trim();
  const washStrengthParsed =
    washStrengthRaw === "" ? Number.NaN : Number(washStrengthRaw);
  const washStrength = Number.isNaN(washStrengthParsed)
    ? 100
    : Math.min(100, Math.max(0, washStrengthParsed));
  // Effective wash scale (0-1): "show full photo" wins outright (0, i.e. no
  // wash at all), otherwise it's the strength slider's fraction. Only
  // meaningful in BG mode — with no photo there's no wash to begin with, so
  // the scale is pinned to the standard-look 1 regardless of saved values.
  const washScale = hasBg ? (showFullPhoto ? 0 : washStrength / 100) : 1;
  // Below this, the wash is thin enough that gold/forest glyphs can graze
  // the raw photo, so the copy column gets a soft cream halo (see the FadeIn
  // column below) — lg+ only, since sub-lg text always sits on the opaque
  // cap layer regardless of wash strength.
  const hasThinWash = hasBg && washScale < 1;
  // Shared halo utility for the copy column's text when the wash is thinned
  // out — a tight cream glow (not a panel) so gold/forest glyphs keep their
  // shape against a busier photo instead of gaining a hard box behind them.
  // Never applied to the Shop Now pill (cream-on-forest — a cream glow would
  // just blur it), so it's applied per-element below, not on a wrapper.
  const textHaloClassName = hasThinWash
    ? "lg:[text-shadow:0_0_1px_var(--bam-cream),0_0_12px_color-mix(in_srgb,var(--bam-cream)_85%,transparent),0_0_28px_color-mix(in_srgb,var(--bam-cream)_60%,transparent)]"
    : undefined;
  const heroImage = f["bamboo.homepage.hero-image"] ?? "";
  const hasForeground = heroImage !== "" && heroImage !== "/placeholder.svg";

  return (
    <section
      {...sectionGroupAttr("homepage", "hero")}
      aria-label="Introduction"
      className={cn(
        "relative overflow-hidden bg-[var(--bam-cream)]",
        // Sub-lg photo-box height (read by the img and the cap layer below;
        // unused at lg+, where the img goes back to full-bleed). It is
        // WIDTH-derived on purpose: it mirrors the right column's aspect
        // spacer (4/5 → `125vw`, sm square → `100vw`, each less the 2rem
        // gutter) + the grid's bottom pad (6rem / md 8rem with the value
        // band, 5rem without) + 1rem of the 3.5rem row gap, so the photo's
        // top edge lands 2.5rem under the CTA row no matter how long the
        // merchant's copy runs — a section-% box would drift up into the copy
        // as the text grows.
        hasBg &&
          (hasValueBand
            ? "[--bam-hero-photo-h:calc(125vw_+_6rem)] sm:[--bam-hero-photo-h:calc(100vw_+_6.5rem)] md:[--bam-hero-photo-h:calc(100vw_+_8.5rem)]"
            : "[--bam-hero-photo-h:calc(125vw_+_5rem)] sm:[--bam-hero-photo-h:calc(100vw_+_5.5rem)]"),
      )}
      // `--bam-hero-wash` drives the wash gradient below: it's a number
      // that's already been clamped to 0-1 above (never merchant text
      // reaching the DOM raw), so landing it in an inline style is
      // injection-safe the same way the tint's hex-regex gate is.
      style={
        hasBg
          ? ({ "--bam-hero-wash": washScale } as React.CSSProperties)
          : undefined
      }
    >
      {hasBg && (
        <>
          {/* Raw `<img>`, not `next/image`: the URL is arbitrary merchant input
              and next/image's remotePatterns allowlist 500s on unknown hosts
              (same reason as `shared/bamboo-page-hero.tsx`). The section keeps
              its cream background as the loading/error fallback. No `fieldAttr`
              on any of these layers — image fields refresh the preview iframe
              through draft-save, they are not textContent-patched, and the
              tint color field goes through that same draft-save refresh.
              Framing: lg+ is full-bleed `inset-0 object-center`, unchanged.
              Below lg the section is ~1500px tall on a phone, so a full-bleed
              cover crop showed only a ~375px central slice of the photo (plain
              stone) and the product never appeared. So sub-lg the photo is
              confined to a bottom-anchored box (`--bam-hero-photo-h`, see the
              section) that fills the spacer zone under the copy, and focused
              `object-[80%_50%]` — the box is always taller than 16:9, so the
              full photo height shows and only x is cropped; 80% keeps a
              subject sitting right of centre (the same composition the lg+
              wash already assumes, since it clears to /5 on the right) in
              frame from 320 to 1023px. */}
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[var(--bam-hero-photo-h)] w-full object-cover object-[80%_50%] select-none lg:top-0 lg:h-full lg:object-center"
          />
          {/* Optional mood wash over the photo — a flat 12% of the merchant's
              hex, never more: the translucent scrim no longer hides the tint
              behind the copy, so 12% is what keeps a worst-case dark tint
              above the measured 4.5:1 gold floor ("tint is mood, scrim is
              contrast", as on pink). No z-index needed; a later z-auto sibling
              paints above the img and below the z-[1] scrim/fade. */}
          {hasTint && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)`,
              }}
            />
          )}
          {/* Scrim: a translucent cream wash, not an opaque panel — the client
              wants the photo to read as a true full-bleed background. The wash
              floors are contrast-measured against the live photo per
              docs/bamboo-accessibility.md (gold at oklch 0.50 has no headroom,
              so the sampled worst pixel under every gold glyph must stay
              ≥4.5:1): raising photo bleed past these stops needs a re-measure,
              and a merchant swapping in a darker photo is caught by the same
              audit cycle. Sub-lg this is no longer the contrast guarantee —
              the copy sits on the opaque cap below, never on the photo — so it
              is only a light editorial softening (/20 → /10) over the photo
              box; the lg+ stops are untouched.
              Added 2026-09-24 (`hero-show-full-photo` / `hero-wash-strength`):
              every alpha stop below is now `<original>% * var(--bam-hero-wash)`
              instead of a fixed Tailwind opacity modifier, so the merchant's
              wash slider (or the full-photo toggle, which pins the variable to
              0) scales the whole gradient uniformly. `color-mix(in srgb, X P%,
              transparent)` and Tailwind's own `/P` opacity modifier both reduce
              to "X at P% alpha" — mixing anything with `transparent` carries
              the other color's channels forward per the CSS Color 4 spec — so
              at the default wash-strength of 100 (scale 1) every stop is
              byte-for-byte the same color as the original fixed classes;
              verified via computed `background-image` in the browser. The
              `--bam-hero-wash` custom property itself is set on the `<section>`
              above from a JS number already clamped to [0, 1], never raw
              merchant text, so it carries no injection risk. */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 z-[1]",
              "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--bam-cream)_calc(20%_*_var(--bam-hero-wash)),transparent),color-mix(in_srgb,var(--bam-cream)_calc(10%_*_var(--bam-hero-wash)),transparent))]",
              "lg:bg-[linear-gradient(to_right,color-mix(in_srgb,var(--bam-cream)_calc(85%_*_var(--bam-hero-wash)),transparent)_50%,color-mix(in_srgb,var(--bam-cream)_calc(40%_*_var(--bam-hero-wash)),transparent)_66%,color-mix(in_srgb,var(--bam-cream)_calc(5%_*_var(--bam-hero-wash)),transparent)_92%)]",
            )}
          />
          {/* Sub-lg cap: opaque cream from the section top down to the photo
              box's top edge, then a 6rem feather to transparent over the
              photo, so the edge never reads as a hard line. It is the sub-lg
              contrast contract: every glyph sits on flat cream (it also covers
              the tint, which is 12% × the old /90 wash ≈ invisible there
              anyway). Worst-pixel sampler, 2026-09-24, 320/390/768px, with and
              without a `#14301f` tint: gold kicker/accent 5.24:1 (flat cream,
              up from 4.69–5.04), forest headline + badge labels 14.31:1, muted
              lede + badge descriptions 7.33:1, "Our story" ≥9.75:1 (the 320px
              low is the wrapped CTA's own shadow). lg+ re-measured unchanged:
              gold ≥4.74:1. `lg:hidden` — lg+ has no cap. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 bottom-[calc(var(--bam-hero-photo-h)_-_6rem)] z-[1] bg-[linear-gradient(to_bottom,var(--bam-cream)_calc(100%_-_6rem),transparent)] lg:hidden"
          />
          {/* Bottom fade: only when there's no value band underneath to take
              over the seam. When `hasValueBand`, the band's own composited
              hairline wave (see `bamboo-value-band-section.tsx`) rides
              directly over this section's photo instead — a second cream
              fade here would flatten the photo before the wave ever reaches
              it, so this layer is skipped and the band's `-mt-14 md:-mt-24`
              pull-up covers the seam on its own. Without a value band, the
              page's flat cream follows directly and this fade still lands
              the photo on it exactly as before. */}
          {!hasValueBand && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 z-[1] h-16 bg-gradient-to-t from-[var(--bam-cream)] to-transparent md:h-24"
            />
          )}
        </>
      )}

      <div
        className={cn(
          "mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-32",
          // When the value band follows, its wave overlaps up into this
          // section (~14rem/24rem) — its crest sits ~16/120 of its height below
          // its top, so pb-24/pb-32 keeps the badges/CTA row ≥40px above the
          // crest. Without a band, this is the original, unchanged pad into the
          // section's own seam.
          hasValueBand ? "pb-24 md:pb-32" : "pb-20 lg:pb-28",
          // FadeIn columns settle at `transform: none`, which destroys the
          // stacking context they'd otherwise create — so the order is spelled
          // out: img (z-auto) → scrim/fade (z-1) → this grid (z-2).
          hasBg && "relative z-[2]",
        )}
      >
        <FadeIn direction="right" className="flex flex-col items-start">
          {tagline ? (
            <p
              className={cn(
                "text-sm font-semibold tracking-widest text-[var(--bam-gold-rich)] uppercase",
                textHaloClassName,
              )}
              {...fieldAttr("bamboo.homepage.hero-tagline")}
            >
              {tagline}
            </p>
          ) : null}

          {/* Spectral (`font-serif`) + the mockup's heavy-caps treatment: bold
              weight and a slightly larger, tighter-leading scale than the
              serif rulebook's standard section h2 — the mockup's hero is
              deliberately heavier than that pattern, the one sanctioned
              exception the rulebook already calls out. `textHaloClassName`
              sits on the `h1` itself rather than each span: `text-shadow` is
              an inherited property, so one class here covers both the forest
              and gold lines below. */}
          <h1
            className={cn(
              "mt-5 font-serif text-[2.5rem] leading-[1.02] font-bold tracking-normal uppercase md:text-6xl xl:text-7xl",
              textHaloClassName,
            )}
          >
            <span
              className="text-foreground block text-balance"
              {...fieldAttr("bamboo.homepage.hero-title")}
            >
              {f["bamboo.homepage.hero-title"] ?? ""}
            </span>
            <span
              className="block text-balance text-[var(--bam-gold-display)]"
              {...fieldAttr("bamboo.homepage.hero-title-accent")}
            >
              {f["bamboo.homepage.hero-title-accent"] ?? ""}
            </span>
          </h1>

          {/* Full-width leaf rule (replaces the old w-16 gold stub): matches
              the headline accent above with `--bam-gold-display` (2026-09-24)
              rather than `--bam-gold-bright` — gold-bright is a lightened
              decorative token tuned for use over the dark forest
              band/photography, and reads too pale against cream at this
              thinness; gold-display is hero-scoped and text-grade on cream. */}
          <div
            aria-hidden="true"
            className="mt-7 flex w-full max-w-md items-center gap-3"
          >
            <span className="h-px flex-1 bg-[var(--bam-gold-display)]/70" />
            <BambooLeafGlyph className="h-5 w-8 shrink-0 text-[var(--bam-gold-display)]" />
            <span className="h-px flex-1 bg-[var(--bam-gold-display)]/70" />
          </div>

          {description ? (
            <p
              className={cn(
                "text-muted-foreground mt-6 max-w-lg text-base leading-relaxed text-pretty md:text-lg",
                textHaloClassName,
              )}
              {...fieldAttr("bamboo.homepage.hero-description")}
            >
              {description}
            </p>
          ) : null}

          {badges.length > 0 && (
            <ul className="mt-8 flex w-full flex-wrap">
              {badges.map((badge, index) => (
                <li
                  key={`${badge.title}-${index}`}
                  className={cn(
                    "flex w-1/3 min-w-0 flex-col items-center gap-2.5 px-2 py-3 text-center sm:w-auto sm:flex-1 sm:py-0",
                    index > 0 &&
                      "sm:border-l sm:border-[var(--bam-hairline)] sm:pl-3",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--bam-forest)]/45"
                  >
                    <badge.icon className="size-5 text-[var(--bam-forest)]" />
                  </span>
                  {/* Halo applies to the label only, not the supporting line
                      below — the label is the short caption merchants scan,
                      and matching moment #6's "eyebrow/h1/description/badge
                      labels/Our Story" scope keeps this consistent with the
                      rest of the copy column. */}
                  <span
                    className={cn(
                      "text-foreground text-[0.625rem] leading-tight font-semibold tracking-widest uppercase",
                      textHaloClassName,
                    )}
                  >
                    {badge.title}
                  </span>
                  {badge.description ? (
                    <span className="text-muted-foreground text-[0.625rem] leading-tight">
                      {badge.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={f["bamboo.homepage.hero-primary-button-link"] ?? "/shop"}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--bam-forest)] px-7 py-3.5 text-base font-semibold tracking-wider text-[var(--bam-cream)] uppercase shadow-lg ring-2 ring-[var(--bam-gold-bright)]/80 transition-colors hover:bg-[var(--bam-forest-deep)]"
            >
              <Leaf
                className="size-4 shrink-0 text-[var(--bam-gold-soft)]"
                aria-hidden="true"
              />
              <span {...fieldAttr("bamboo.homepage.hero-primary-button-text")}>
                {f["bamboo.homepage.hero-primary-button-text"] ?? ""}
              </span>
              <ArrowRight
                className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>

            {secondaryText ? (
              <Link
                href={
                  f["bamboo.homepage.hero-secondary-button-link"] ?? "/about"
                }
                className={cn(
                  "text-sm font-semibold tracking-widest text-[var(--bam-forest)] uppercase underline-offset-8 transition-colors hover:text-[var(--bam-forest-deep)] hover:underline",
                  textHaloClassName,
                )}
                {...fieldAttr("bamboo.homepage.hero-secondary-button-text")}
              >
                {secondaryText}
              </Link>
            ) : null}
          </div>
        </FadeIn>

        <FadeIn
          direction="left"
          delay={0.15}
          className={cn("relative", hasBg && "lg:self-stretch")}
        >
          {hasBg ? (
            // Over photography the arch would frame a frame, so the product
            // floats instead — and it floats shadowless: `drop-shadow` is a
            // filter that traces the alpha silhouette, which hugs a cut-out
            // PNG but paints a rectangular halo around any opaque photo, so
            // it's gone. The aspect box renders UNCONDITIONALLY below lg: it
            // is a load-bearing geometry spacer there, because it is the zone
            // the sub-lg photo box (`--bam-hero-photo-h` on the section,
            // which mirrors these exact aspect classes) fills with the
            // product shot — change `aspect-4/5 sm:aspect-square` and that
            // height calc must change with it, then re-measure.
            // At lg+, the box instead stops forcing a height at all
            // (`lg:aspect-auto lg:h-full lg:min-h-[26rem]`) and stretches to
            // match the grid row (the grid is `items-center`, and this
            // FadeIn column carries `lg:self-stretch` for the same reason) —
            // that's what lets the photo run straight down into the value
            // band's thin gold wave line instead of stopping short inside a
            // fixed aspect box. `object-contain object-bottom` keeps the
            // foreground image's own baseline anchored to that bottom edge
            // as the box's height changes with viewport/content. With no
            // real hero image set, the background photo alone is the hero
            // and this box just holds the row open.
            <div className="relative aspect-4/5 w-full sm:aspect-square lg:aspect-auto lg:h-full lg:min-h-[26rem]">
              {hasForeground && (
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  className="object-contain object-bottom"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              )}
            </div>
          ) : (
            <>
              {/* Offset gold hairline frame — the arch is echoed, never outlined twice. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-t-full rounded-b-2xl border border-[var(--bam-gold)]/25"
              />
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-t-full rounded-b-2xl bg-[var(--bam-cream-deep)] ring-1 ring-[var(--bam-gold)]/30 sm:aspect-square lg:aspect-4/5">
                <Image
                  src={f["bamboo.homepage.hero-image"] ?? "/placeholder.svg"}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>
            </>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
