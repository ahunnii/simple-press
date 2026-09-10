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

type Props = { customFields: unknown };

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
 */
export function BambooHeroSection({ customFields }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.hero-bg-image",
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

  return (
    <section
      {...sectionGroupAttr("homepage", "hero")}
      aria-label="Introduction"
      className="relative overflow-hidden bg-[var(--bam-cream)]"
    >
      {hasBg && (
        <>
          {/* Raw `<img>`, not `next/image`: the URL is arbitrary merchant input
              and next/image's remotePatterns allowlist 500s on unknown hosts
              (same reason as `shared/bamboo-page-hero.tsx`). The section keeps
              its cream background as the loading/error fallback. No `fieldAttr`
              on any of these layers — image fields refresh the preview iframe
              through draft-save, they are not textContent-patched. */}
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
          {/* Scrim. Must stay FULLY opaque cream behind the copy column:
              `--bam-gold` sits at oklch(0.50) for ~5:1 on cream with no
              headroom (docs/bamboo-accessibility.md), so any photo bleeding
              through under the kicker/accent line drops it below 4.5:1. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] bg-gradient-to-b from-[var(--bam-cream)] from-66% via-[var(--bam-cream)]/85 via-82% to-[var(--bam-cream)]/40 lg:bg-gradient-to-r lg:from-[var(--bam-cream)] lg:from-50% lg:via-[var(--bam-cream)]/75 lg:via-66% lg:to-transparent lg:to-88%"
          />
          {/* Bottom fade: the value band's wave strip paints flat cream above
              its curve, so the photo has to land on cream at the seam or the
              wave reads as a hard cut. Also covers the case where the value
              band is hidden and cream page background follows instead. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-[1] h-16 bg-gradient-to-t from-[var(--bam-cream)] to-transparent md:h-24"
          />
        </>
      )}

      <div
        className={cn(
          "mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-24 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-32 lg:pb-28",
          // FadeIn columns settle at `transform: none`, which destroys the
          // stacking context they'd otherwise create — so the order is spelled
          // out: img (z-auto) → scrim/fade (z-1) → this grid (z-2).
          hasBg && "relative z-[2]",
        )}
      >
        <FadeIn direction="right" className="flex flex-col items-start">
          {tagline ? (
            <p
              className="text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
              {...fieldAttr("bamboo.homepage.hero-tagline")}
            >
              {tagline}
            </p>
          ) : null}

          {/* Spectral (`font-serif`) + the mockup's caps treatment: the caps are
              pinned by the client mockup, the serif is the shared happy-bamboo
              accent voice. Section h2s take the same serif WITHOUT the caps. */}
          <h1 className="mt-5 font-serif text-4xl leading-[1.08] tracking-wide uppercase md:text-5xl lg:text-6xl">
            <span
              className="text-foreground block text-balance"
              {...fieldAttr("bamboo.homepage.hero-title")}
            >
              {f["bamboo.homepage.hero-title"] ?? ""}
            </span>
            <span
              className="block text-balance text-[var(--bam-gold)]"
              {...fieldAttr("bamboo.homepage.hero-title-accent")}
            >
              {f["bamboo.homepage.hero-title-accent"] ?? ""}
            </span>
          </h1>

          <span
            aria-hidden="true"
            className="mt-7 block h-px w-16 bg-[var(--bam-gold)]"
          />

          {description ? (
            <p
              className="text-muted-foreground mt-7 max-w-md text-lg leading-relaxed text-pretty"
              {...fieldAttr("bamboo.homepage.hero-description")}
            >
              {description}
            </p>
          ) : null}

          {badges.length > 0 && (
            <ul className="mt-10 flex w-full flex-wrap border-y border-[var(--bam-hairline)] py-6">
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
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold)]/40"
                  >
                    <badge.icon className="size-5 text-[var(--bam-forest)]" />
                  </span>
                  <span className="text-foreground text-[0.625rem] leading-tight font-semibold tracking-widest uppercase">
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

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={f["bamboo.homepage.hero-primary-button-link"] ?? "/shop"}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--bam-forest)] px-7 py-3.5 text-sm font-semibold tracking-widest text-[var(--bam-cream)] uppercase transition-colors hover:bg-[var(--bam-forest-deep)]"
            >
              <Leaf className="size-4 shrink-0" aria-hidden="true" />
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
                className="text-sm font-semibold tracking-widest text-[var(--bam-forest)] uppercase underline-offset-8 transition-colors hover:text-[var(--bam-forest-deep)] hover:underline"
                {...fieldAttr("bamboo.homepage.hero-secondary-button-text")}
              >
                {secondaryText}
              </Link>
            ) : null}
          </div>
        </FadeIn>

        <FadeIn direction="left" delay={0.15} className="relative">
          {hasBg ? (
            // Over photography the arch would frame a frame, so the product
            // floats instead: same aspect box so the grid row can't collapse,
            // and a `drop-shadow` (a filter — it follows the alpha silhouette)
            // rather than a box-shadow, which would draw a rectangle behind a
            // PNG cut-out instead of hugging it like the client mockup.
            <div className="relative aspect-4/5 w-full sm:aspect-square lg:aspect-4/5">
              <Image
                src={f["bamboo.homepage.hero-image"] ?? "/placeholder.svg"}
                alt=""
                fill
                priority
                className="object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.25)]"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
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
