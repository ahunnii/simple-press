import { cn } from "~/lib/utils";

import { RelocationCircleImage } from "./relocation-circle-image";
import { RelocationPillButton } from "./relocation-pill-button";

/**
 * The wave hero — the template's signature primitive (design.md → "The wave
 * hero", REVISED 2026-08-10).
 *
 * The wave the visitor actually sees is the ORIGINAL SITE'S RASTER
 * (`wave-hero.webp`, 2500×1405 — the same file behind every source hero): a
 * diagonal maroon→vivid-red gradient with a deep organic white wave painted
 * into its bottom. It renders as a full-bleed `object-cover` background image;
 * on desktop the `tall` variant pins the section to the raster's own aspect so
 * the wave shows uncropped, exactly like the reference screenshots.
 *
 * Beneath it, the 135° token gradient clipped by the recovered Squarespace
 * divider path (`clip-path: url(#relocation-wave)`, emitted once by
 * `RelocationLayout`) remains as the PRE-LOAD/FALLBACK layer only — the
 * divider's 3.8%-of-height amplitude is far shallower than the painted wave,
 * which is why it can't be the primary rendering (first iterate-pass finding).
 *
 * Neither layer ever clips the content wrapper — copy stays above the wave
 * trough via generous bottom padding.
 */

const WAVE_BACKGROUND_SRC = "/templates/relocation/images/wave-hero.webp";
export function RelocationWaveHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  photoSrc,
  photoAlt,
  size = "tall",
  backgroundSrc = WAVE_BACKGROUND_SRC,
  backgroundPosition = "96.493% 29.2829%",
  className,
  children,
  sectionAttrs,
  titleFieldAttrs,
  subtitleFieldAttrs,
  ctaFieldAttrs,
}: {
  title: string;
  subtitle?: string;
  /** Omit (or pass an empty string) to render no CTA. */
  ctaLabel?: string;
  ctaHref?: string;
  photoSrc?: string;
  photoAlt?: string;
  /** `tall` ≈ full viewport (homepage); `compact` ≈ 58vh (inner + CMS pages). */
  size?: "tall" | "compact";
  /** The painted-wave raster. Pass "" to fall back to the gradient plate only. */
  backgroundSrc?: string;
  /** CSS object-position for the raster when the section cover-crops it. */
  backgroundPosition?: string;
  className?: string;
  /** Extra content rendered under the subtitle, above the CTA. */
  children?: React.ReactNode;
  sectionAttrs?: Record<string, string>;
  titleFieldAttrs?: Record<string, string>;
  subtitleFieldAttrs?: Record<string, string>;
  ctaFieldAttrs?: Record<string, string>;
}) {
  const tall = size === "tall";
  const hasPhoto = Boolean(photoSrc);

  return (
    <section
      {...sectionAttrs}
      className={cn(
        "relative isolate w-full overflow-hidden bg-[var(--relocation-paper)] text-[var(--relocation-paper)]",
        tall ? "min-h-screen" : "min-h-[58vh]",
        className,
      )}
    >
      {/* Fallback gradient plate — visible only before the raster loads (or
          when backgroundSrc=""). The only clipped element. Sized like the
          raster below so the fallback shares its geometry. */}
      <div
        aria-hidden="true"
        className="relocation-wave-plate absolute inset-x-0 top-0 -z-20 h-[77.4375rem] max-h-full"
      />

      {/* The painted wave — the original site's raster, reproduced with the
          source's exact recipe: fixed 77.4375rem height, object-cover, the
          clone's object-position. The reference screenshots ARE this crop —
          showing the raster whole (aspect-fit) reads too red and too wavy. */}
      {backgroundSrc ? (
        <img
          src={backgroundSrc}
          alt=""
          aria-hidden="true"
          width={2500}
          height={1405}
          decoding="async"
          className="absolute inset-x-0 top-0 -z-10 h-[77.4375rem] max-h-none w-full object-cover"
          style={{ objectPosition: backgroundPosition }}
        />
      ) : null}

      <div
        className={cn(
          "mx-auto flex w-full max-w-[85rem] flex-col gap-10 px-6 min-[572px]:px-10 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:gap-16 min-[1025px]:px-16",
          tall
            ? "pt-16 pb-[24vh] min-[1025px]:min-h-screen min-[1025px]:pt-24 min-[1025px]:pb-[22vh]"
            : "pt-12 pb-[22vh] min-[1025px]:min-h-[58vh] min-[1025px]:pt-16 min-[1025px]:pb-[20vh]",
        )}
      >
        <div
          className={
            hasPhoto ? "min-[1025px]:w-1/2" : "min-[1025px]:max-w-[46rem]"
          }
        >
          <h1
            {...titleFieldAttrs}
            className="[font-family:var(--font-relocation-display)] text-[2.8125rem] leading-[3rem] font-bold text-balance min-[1025px]:text-[4rem] min-[1025px]:leading-[4.25rem]"
          >
            {title}
          </h1>

          {subtitle ? (
            <p
              {...subtitleFieldAttrs}
              className="mt-6 max-w-[34rem] [font-family:var(--font-relocation-display)] text-[1.125rem] leading-[1.8125rem] font-bold"
            >
              {subtitle}
            </p>
          ) : null}

          {children}

          {ctaLabel && ctaHref ? (
            <div className="mt-10">
              <RelocationPillButton
                href={ctaHref}
                variant="outline-light"
                labelAttrs={ctaFieldAttrs}
              >
                {ctaLabel}
              </RelocationPillButton>
            </div>
          ) : null}
        </div>

        {photoSrc ? (
          <div className="flex justify-center min-[1025px]:w-1/2 min-[1025px]:justify-end">
            <RelocationCircleImage
              src={photoSrc}
              alt={photoAlt ?? ""}
              size={430}
              eager
              className="max-w-[min(100%,26.875rem)]"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
