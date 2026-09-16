/* eslint-disable @next/next/no-img-element */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

type Props = {
  /** Uppercase gold kicker above the headline. Omit for no eyebrow. */
  eyebrow?: string;
  /** Decorative lucide glyph rendered inline before the eyebrow text. */
  eyebrowIcon?: LucideIcon;
  /** Set when the eyebrow is a live-patchable text field. */
  eyebrowFieldKey?: string;
  title: ReactNode;
  /** Set when the title is a live-patchable text field. */
  titleFieldKey?: string;
  lede?: string | null;
  /** Set when the lede is a live-patchable text field. */
  ledeFieldKey?: string;
  /** Arch portrait URL. Null/undefined renders the text-only variant. */
  image?: string | null;
  imagePriority?: boolean;
  /**
   * Optional full-bleed background photo behind the whole hero band.
   * Resolution order (caller's responsibility): per-page override field ||
   * global `bamboo.global.page-hero-bg-image` field || "". Empty/null
   * renders today's flat `bg-[var(--bam-cream-deep)]` band, byte-identical
   * to before this prop existed.
   */
  bgImage?: string | null;
  /** Spread of `sectionGroupAttr(...)` for the preview overlay. */
  sectionAttrs?: Record<string, string>;
  /** Extra content under the lede (e.g. the blog page's search box). */
  children?: ReactNode;
  className?: string;
};

/**
 * Shared page hero — cream-deep band, gold eyebrow → serif h1 → gold rule →
 * muted lede (docs/templates/bamboo/design.md "Section rhythm"), with an
 * optional arch portrait whose offset gold ring echoes the nav emblem.
 *
 * Hook-free on purpose: server pages (about) and client pages (blog, contact)
 * both import it, so it must never become a client component itself.
 *
 * The portrait is a raw `<img>` rather than `next/image` because field URLs
 * are arbitrary merchant input, matching `blog/bamboo-blog-page.tsx`.
 *
 * Two independent background modes coexist here:
 * - `image` (the arch portrait, signature moment #5) — always renders in its
 *   own right-column frame, above everything else.
 * - `bgImage` (added for the interior variant, signature moment #6) — an
 *   optional full-bleed photo behind the whole band. Callers resolve
 *   `perPage || global || ""` themselves and pass the merged string; this
 *   component only checks for non-empty. Unlike the homepage's directional
 *   scrim, this uses one FLAT translucent wash (`/90` — see
 *   docs/bamboo-accessibility.md) because interior text layouts vary
 *   (centered, left+arch, left+search box) and one wash needs one contrast
 *   measurement to cover all of them. An arch portrait may be set at the
 *   same time as `bgImage` — it renders above the wash, unaffected.
 */
export function BambooPageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  eyebrowFieldKey,
  title,
  titleFieldKey,
  lede,
  ledeFieldKey,
  image,
  imagePriority,
  bgImage,
  sectionAttrs,
  children,
  className,
}: Props) {
  const hasBg = (bgImage ?? "").length > 0;
  const eyebrowBlock = eyebrow ? (
    <p
      className="mb-3 text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
      {...(eyebrowFieldKey ? fieldAttr(eyebrowFieldKey) : {})}
    >
      {EyebrowIcon ? (
        <EyebrowIcon
          className="-mt-0.5 mr-1 inline h-3 w-3"
          aria-hidden="true"
        />
      ) : null}
      {eyebrow}
    </p>
  ) : null;

  const titleBlock = (
    <h1 className="text-foreground font-serif text-4xl leading-tight font-bold tracking-tight md:text-5xl">
      <span
        className="text-balance"
        {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
      >
        {title}
      </span>
    </h1>
  );

  const ruleBlock = (
    <div
      className="mx-auto mt-6 h-px w-16 bg-[var(--bam-gold)]/40 md:mx-0"
      aria-hidden="true"
    />
  );

  const ledeBlock = lede ? (
    <p
      className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed md:mx-0"
      {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
    >
      {lede}
    </p>
  ) : null;

  return (
    <section
      {...sectionAttrs}
      className={cn(
        "bg-[var(--bam-cream-deep)]",
        hasBg && "relative isolate overflow-hidden",
        className,
      )}
    >
      {hasBg && (
        <>
          {/* Raw `<img>`, not `next/image`: the URL is arbitrary merchant
              input and next/image's remotePatterns allowlist 500s on unknown
              hosts (same reason as `homepage/bamboo-hero-section.tsx`). The
              section keeps its cream-deep background as the loading/error
              fallback. No `fieldAttr` here — image fields refresh the
              preview iframe through draft-save, not textContent-patching. */}
          <img
            src={bgImage ?? ""}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
          {/* Flat translucent wash, not the homepage's directional gradient:
              interior layouts vary (centered, left+arch, left+search box),
              so one flat wash keeps one contrast measurement valid across
              all of them. /90 per docs/bamboo-accessibility.md — the gold
              eyebrow token has no headroom, so the wash floor was raised
              from the originally proposed /85. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] bg-[var(--bam-cream-deep)]/90"
          />
          {/* Bottom fade to the band's OWN color — every caller already
              knows what sits below (form, article grid, page body), so this
              stays generic rather than needing per-page knowledge. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-[var(--bam-cream-deep)] to-transparent md:h-14"
          />
        </>
      )}
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8",
          hasBg && "relative z-[2]",
        )}
      >
        {image ? (
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn
              direction="right"
              className="flex-1 text-center md:text-left"
            >
              {eyebrowBlock}
              {titleBlock}
              {ruleBlock}
              {ledeBlock}
              {children}
            </FadeIn>
            <FadeIn
              direction="left"
              delay={0.15}
              className="flex flex-1 justify-center md:justify-end"
            >
              <div className="relative w-full max-w-[15rem] md:max-w-[17rem]">
                {/* offset gold ring tracing the arch — emblem echo */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2.5 -right-2.5 h-full w-full rounded-t-full rounded-b-2xl border border-[var(--bam-gold)]/50"
                />
                <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl border border-[var(--bam-hairline)]">
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    loading={imagePriority ? "eager" : "lazy"}
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        ) : (
          <FadeIn
            direction="up"
            className="mx-auto max-w-2xl text-center md:mx-0 md:text-left"
          >
            {eyebrowBlock}
            {titleBlock}
            {ruleBlock}
            {ledeBlock}
            {children}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
