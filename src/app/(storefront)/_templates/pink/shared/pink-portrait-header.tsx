import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { hasCustomImage } from "./pink-image-fallback";
import type { PinkBreadcrumbItem } from "./pink-page-header";
import { PinkRule } from "./pink-rule";

type PinkPortraitHeaderProps = {
  /** 4:5 portrait. Blank (or the platform `/placeholder.svg`) → wash-only band. */
  imageUrl?: string;
  imageAlt?: string;
  breadcrumb?: PinkBreadcrumbItem[];
  heading: string;
  headingFieldKey?: string;
  intro?: string;
  introFieldKey?: string;
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * The pale-wash portrait header: breadcrumb → accent rule → H1 → intro in a
 * left column, with a 4:5 portrait photograph in a right column.
 *
 * Why this exists rather than a prop on `PinkPhotoHeader` (2026-07-31, client
 * direction): the photo header is a full-bleed `--pink-ink` band, and black is
 * now used selectively — the homepage events band and the footer. About was
 * still opening on a 66vh dark slab while every other interior page opened
 * light, so it read as the odd page out. `PinkPhotoHeader` itself is correct
 * where it is still used (collection detail, service detail): both draw their
 * hero from a DB-backed `Collection` / `Service` image, so the dark treatment
 * always has a photograph under it. About's hero image is an owner-editable
 * field with no record behind it, which is exactly why it failed — a fresh
 * store rendered an empty near-black slab.
 *
 * **No image set is a first-class state, not a fallback.** The image column is
 * dropped entirely and the band reads as a deliberate pale-pink opener — the
 * same shape as `PinkPageHeader`, one tone warmer. No placeholder slab, no
 * stitch-mark stand-in: a hero is too large a surface for either to read as
 * anything but broken.
 *
 * Every colour here is on the light ramp (`--pink-ink` / `--pink-body` /
 * `--pink-subtle` / `--pink-rose`); `--pink-blush` and the `--pink-ink-*`
 * family are dark-surface only and must never appear on the wash.
 *
 * H1 scale sits between the two existing headers — the photo header's
 * `5.75rem` ceiling assumes a full-bleed text column, and this one shares its
 * row with the portrait. Server-safe.
 */
export function PinkPortraitHeader({
  imageUrl,
  imageAlt = "",
  breadcrumb,
  heading,
  headingFieldKey,
  intro,
  introFieldKey,
  sectionAttrs,
  className,
}: PinkPortraitHeaderProps) {
  // `hasCustomImage` also rejects the platform's generic `/placeholder.svg`,
  // which this field carries as its default (light-surface convention), so a
  // store that has never set a portrait lands in the wash-only state.
  const portrait = imageUrl && hasCustomImage(imageUrl) ? imageUrl : null;

  return (
    <header
      className={`px-5 py-14 md:px-10 md:py-20${className ? ` ${className}` : ""}`}
      style={{ background: "var(--pink-panel)", color: "var(--pink-ink)" }}
      {...sectionAttrs}
    >
      <div
        className={`mx-auto grid max-w-[1400px] gap-10 md:items-center md:gap-14${
          portrait ? " md:grid-cols-[1fr_0.6fr]" : ""
        }`}
      >
        {/* `min-w-0` on both tracks: a grid item's default `min-width: auto`
            lets a long unbroken word push the track past the viewport, which is
            how this template's only horizontal-overflow bugs have started. */}
        <div className="flex min-w-0 flex-col gap-4">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.label + i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden="true" style={{ color: "var(--pink-subtle)" }}>
                      /
                    </span>
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-[0.8125rem] transition-colors hover:opacity-80"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[0.8125rem]" style={{ color: "var(--pink-subtle)" }}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* Light-ramp accent. Carries the pink through the band in the
              no-image state, where there is otherwise nothing but type. */}
          <PinkRule width={44} className="mt-1" />

          <h1
            // `max-w` matters most in the no-image state: without the portrait
            // the text column owns the full 1400px and a headline at the
            // 4.25rem ceiling would run as one very long line.
            className="pink-display max-w-[20ch]"
            style={{
              fontSize: "clamp(2.25rem, 4.4vw, 4.25rem)",
              fontWeight: 600,
              letterSpacing: "-0.032em",
              lineHeight: 1.0,
              color: "var(--pink-ink)",
            }}
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h1>

          {intro && (
            <p
              className="max-w-[46ch] text-[1.0625rem] leading-[1.7]"
              style={{ color: "var(--pink-body)" }}
              {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
            >
              {intro}
            </p>
          )}
        </div>

        {portrait && (
          <div
            // Capped and centred below `md`: a full-bleed 4:5 portrait on a
            // 390px phone is ~490px tall and pushes the headline off screen.
            className="relative mx-auto w-full min-w-0 max-w-[420px] overflow-hidden md:mx-0 md:max-w-none"
            style={{ aspectRatio: "4 / 5", background: "var(--pink-panel-strong)" }}
          >
            <Image
              src={portrait}
              alt={imageAlt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) min(100vw, 420px), 40vw"
            />
          </div>
        )}
      </div>
    </header>
  );
}
