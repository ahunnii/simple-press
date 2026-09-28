import type { ReactNode } from "react";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

/**
 * noise's generic page base — the title band and body container every
 * CMS page (`/privacy-policy`, `/<slug>`) and every optional page (events,
 * videos, donate, FAQ, services) sits on, so they read as one family
 * (baseline B1.2).
 *
 * Widths (B1.7, parity decision 2026-09-28):
 * - the band's text block is centred at 880px;
 * - `measure` bodies (prose, the donate form, FAQ) are a centred
 *   `max-w-3xl` column under the centred title, so heading and body share
 *   one centre line;
 * - `wide` bodies (event rows, the video grid, service cards) use the
 *   footer's container — 1320px with a 28px gutter (24px under `sm`) — so
 *   their left edge matches the footer's.
 */
export const NOISE_BODY_WIDTH = {
  measure: "mx-auto w-full max-w-3xl px-6",
  wide: "mx-auto w-full max-w-[1320px] px-6 sm:px-7",
} as const;

export type NoiseBodyWidth = keyof typeof NOISE_BODY_WIDTH;

/**
 * Tailwind Typography mapped onto noise's type: italic light Cormorant
 * headings, 15px DM Sans body at a loose leading, hairline rules. Shared by
 * the generic page and the service detail intro.
 */
export const NOISE_PROSE_CLASS =
  "prose prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-headings:tracking-tight prose-headings:text-(--vn-ink) prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.95] prose-p:tracking-[0.01em] prose-p:text-(--vn-ink-soft) prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-(--vn-ink) prose-strong:tracking-normal prose-a:text-(--vn-ink) prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-(--vn-ink-soft) prose-li:tracking-[0.01em] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l prose-blockquote:border-(--vn-rule) prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:text-[1.1rem] prose-blockquote:text-(--vn-ink-soft) prose-blockquote:not-italic prose-hr:border-(--vn-rule) prose-hr:my-10 max-w-none";

/** Mono overline — the small tracked label above every noise page title. */
export const NOISE_OVERLINE_CLASS =
  "font-mono text-[10px] tracking-[0.28em] text-(--vn-steel-mist) uppercase";

/**
 * The blog's no-image placeholder — a fine hatch over the dark gradient —
 * used wherever a noise page draws the absence of a photo.
 */
export const NOISE_HATCH_BACKGROUND =
  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--vn-bone) 6%, transparent) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))";

/** Mono meta line — dates, prices, counts. */
export const NOISE_META_CLASS =
  "font-mono text-[10px] tracking-[0.18em] text-(--vn-steel-mist) uppercase";

type BandProps = {
  /** Small tracked label above the title. Hidden when blank. */
  overline?: string | null;
  overlineFieldKey?: string;
  /** The page's only h1. */
  title: string;
  titleFieldKey?: string;
  /** One short paragraph under the title. Hidden when blank. */
  intro?: string | null;
  introFieldKey?: string;
  /** Rendered above the overline — a back link on detail pages. */
  leading?: ReactNode;
  /** Rendered under the intro — dates, locations, notices. */
  children?: ReactNode;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
};

/**
 * NoisePageBand — the centred title band from noise's generic page: mono
 * overline, italic Cormorant h1, a sans intro at a 60ch measure.
 */
export function NoisePageBand({
  overline,
  overlineFieldKey,
  title,
  titleFieldKey,
  intro,
  introFieldKey,
  leading,
  children,
  sectionAttrs,
}: BandProps) {
  const overlineText = overline?.trim() ? overline : null;
  const introText = intro?.trim() ? intro : null;

  return (
    <header className="px-6 pt-20 pb-16 text-center" {...sectionAttrs}>
      <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
        {leading ? <div className="mb-6">{leading}</div> : null}
        {overlineText ? (
          <p
            className={cn("mb-5", NOISE_OVERLINE_CLASS)}
            {...(overlineFieldKey ? fieldAttr(overlineFieldKey) : {})}
          >
            {overlineText}
          </p>
        ) : null}
        <h1
          className="font-serif leading-none tracking-tight break-words italic"
          style={{
            fontSize: "clamp(2.8rem, 7vw, 5rem)",
            letterSpacing: "-0.025em",
          }}
          {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
        >
          {title}
        </h1>
        {introText ? (
          <p
            className="mx-auto mt-6 font-sans text-[15px] leading-[1.85] text-(--vn-ink-soft)"
            style={{ maxWidth: "60ch" }}
            {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
          >
            {introText}
          </p>
        ) : null}
        {children}
      </FadeIn>
    </header>
  );
}

type BodyProps = {
  width?: NoiseBodyWidth;
  children: ReactNode;
  /** Landmark name for the body section. */
  "aria-label"?: string;
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * NoisePageBody — the section under the band. Carries the page's shared
 * container; never narrow it from the outside (that moves the edge) —
 * narrow a child instead.
 */
export function NoisePageBody({
  width = "measure",
  children,
  "aria-label": ariaLabel,
  sectionAttrs,
  className,
}: BodyProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("pb-20", className)}
      {...sectionAttrs}
    >
      <div className={NOISE_BODY_WIDTH[width]}>{children}</div>
    </section>
  );
}

/** Back link above a detail page's overline ("← All events"). */
export function NoiseBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-block font-mono text-[10px] tracking-[0.22em] text-(--vn-steel-mist) uppercase transition-opacity hover:opacity-60"
    >
      {children}
    </Link>
  );
}
