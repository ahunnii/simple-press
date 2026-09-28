import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

/**
 * umsc's generic page base — the small kit every page built on the generic
 * base composes (blog, events, videos, donate, services, the service detail
 * variant), next to `UmscPageHero` (the black title band) and `UmscSection`
 * (the shared container + `--umsc-section-pad-x` edge). Server-safe.
 *
 * Width rhythm (B1.7): nothing here adds its own horizontal padding or a
 * centred narrow column — bodies sit on `UmscSection`'s container, so the
 * hero h1, every section heading and every body paragraph share one left
 * edge. Narrow a child (`max-w-[66ch]`), never the section.
 */

/** Uppercase meta line — dates, prices, counts (Work Sans 12px/.13em). */
export const UMSC_META_CLASS =
  "umsc-sans text-[12px] font-semibold tracking-[0.13em] uppercase";

/**
 * UmscBackLink — the gold-soft "← All events" link above a detail page's h1
 * in the black band. 44px hit area.
 */
export function UmscBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        UMSC_META_CLASS,
        "-my-3 inline-flex items-center gap-2 py-3 text-[var(--umsc-gold-soft)] no-underline transition-opacity hover:opacity-80",
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-[14px]" strokeWidth={1.5} />
      {children}
    </Link>
  );
}

type EmptyStateProps = {
  heading: string;
  headingFieldKey?: string;
  body?: string | null;
  bodyFieldKey?: string;
  /** A link or button under the body (usually a `UmscGatedLink`). */
  children?: ReactNode;
  className?: string;
};

/**
 * UmscEmptyState — the designed empty list: a cream hairline panel with the
 * round UM mark beside a Marcellus heading, one line of body and an optional
 * way out. Left-aligned to the page edge, never a blank box.
 */
export function UmscEmptyState({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
  className,
}: EmptyStateProps) {
  const bodyText = body?.trim() ? body : null;
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-6 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-6 py-12 sm:flex-row sm:items-center sm:gap-10 sm:px-12 sm:py-16",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="umsc-serif flex size-16 shrink-0 items-center justify-center rounded-full border border-[var(--umsc-line)] text-[18px] tracking-[0.04em] text-[var(--umsc-gold-ink)]"
      >
        UM
      </span>
      <div className="flex min-w-0 flex-col items-start gap-3">
        <UmscHeading
          as="h2"
          fieldKey={headingFieldKey}
          className="text-[clamp(22px,2.2vw,30px)] leading-[1.15]"
        >
          {heading}
        </UmscHeading>
        {bodyText ? (
          <p
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            className="umsc-sans max-w-[56ch] text-[16px] leading-[1.6] text-[var(--umsc-muted)]"
          >
            {bodyText}
          </p>
        ) : null}
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}

type ClosingBandProps = {
  heading: string;
  headingFieldKey?: string;
  body?: string | null;
  bodyFieldKey?: string;
  /** Buttons / embeds — rendered outside the reveal so a booking form never starts hidden. */
  children?: ReactNode;
  sectionAttrs?: Record<string, string>;
  "aria-label"?: string;
};

/**
 * UmscClosingBand — the black closing band shared by the optional pages (the
 * same hand as the homepage custom band and the About CTA): gold hairline top
 * rule, centred Marcellus h2, one cream-on-black line, gold pill(s).
 * Heading and body rise in with the umsc reveal; actions sit outside it.
 * Renders nothing when heading, body and actions are all empty.
 */
export function UmscClosingBand({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
  sectionAttrs,
  "aria-label": ariaLabel,
}: ClosingBandProps) {
  const headingText = heading.trim() ? heading : null;
  const bodyText = body?.trim() ? body : null;
  if (!headingText && !bodyText && !children) return null;

  return (
    <UmscSection
      tone="black"
      aria-label={ariaLabel ?? headingText ?? undefined}
      sectionAttrs={sectionAttrs}
      className="umsc-black-surface border-t-2 border-[var(--umsc-gold)]"
    >
      <div className="flex flex-col items-center gap-8 text-center">
        {headingText || bodyText ? (
          <UmscReveal className="flex flex-col items-center gap-5">
            {headingText ? (
              <UmscHeading
                as="h2"
                fieldKey={headingFieldKey}
                className="text-[var(--umsc-cream-on-black)]"
              >
                {headingText}
              </UmscHeading>
            ) : null}
            {bodyText ? (
              <UmscLede onBlack fieldKey={bodyFieldKey} className="mx-auto">
                {bodyText}
              </UmscLede>
            ) : null}
          </UmscReveal>
        ) : null}
        {children ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-4">
            {children}
          </div>
        ) : null}
      </div>
    </UmscSection>
  );
}
