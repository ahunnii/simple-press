import Link from "next/link";

import type { DefaultEventPageTemplateProps } from "../../types";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import {
  eventDateTimeAttr,
  formatEventDateParts,
  formatEventLeaf,
} from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

import { resolveFields } from "..";
import { PinkBadge } from "../shared/pink-badge";
import { PinkCtaPanel } from "../shared/pink-cta-panel";
import { PinkFactRows } from "../shared/pink-fact-rows";
import { hasCustomImage } from "../shared/pink-image-fallback";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkEventFlier } from "./pink-event-flier";

/** First candidate with visible text — mirrors the events index. */
function firstNonBlank(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  return candidates.find((candidate) => candidate?.trim()) ?? undefined;
}

/**
 * `/events/<slug>` — one dated `Event` on its own page.
 *
 * Structure (design.md → Event detail — calendar leaf): the page leads with
 * the DATE as a display object, because "when can I come" is the question
 * the events index is built around and this page has to answer it before
 * anything else. A tear-off calendar leaf — long weekday and month above a
 * Syne day numeral, the time under it, then the When/Where/Cost fact rows —
 * takes the left column; the flier stands in the right column at the same
 * flier-over-meta relationship every `PinkEventCard` has, only at page
 * scale. The name, blurb and the ticket-stub row (outbound link + optional
 * QR) hang beneath, under a 1px ink rule. The page closes on the events
 * index's own CTA panel, driven by the same `events.cta` fields.
 *
 * DOM order is heading-first (h1 → leaf → flier → blurb → stub) for
 * assistive tech; the VISUAL order at every width is leaf-first, via CSS
 * `order` on the grid children and explicit row placement at `lg`.
 *
 * Stays a server component so `resolveFields` / `isSectionVisible` run on
 * the server; `PinkEventFlier`, `PinkReveal` and the QR are the client
 * leaves. Every date goes through `Business.timeZone` — never `toLocale*`.
 */
export function PinkEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pink.events.list-flier-hint",
    "pink.events.list-link-fallback-label",
    "pink.events.detail-when-label",
    "pink.events.detail-where-label",
    "pink.events.detail-cost-label",
    "pink.events.detail-past-badge",
    "pink.events.detail-scan-label",
    "pink.events.detail-back-label",
    "pink.events.cta-heading",
    "pink.events.cta-body",
    "pink.events.cta-primary-label",
    "pink.events.cta-primary-link",
    "pink.events.cta-image-1",
    "pink.events.cta-image-2",
  ]);

  // Per-event label → owner's template-wide fallback → hardcoded. A cleared
  // field is "" not null, so `??` alone would leave an unnamed link behind.
  const linkLabel =
    firstNonBlank(
      event.externalUrlLabel,
      f["pink.events.list-link-fallback-label"],
      "Details & tickets",
    ) ?? "Details & tickets";

  const leaf = formatEventLeaf(event, timeZone);
  const when = formatEventDateParts(event, timeZone, { showZone: true });

  // The leaf already says the weekday, month and day, so a "When" row only
  // earns its place when it carries something the leaf can't: a multi-day
  // range, or a year (formatEventDateParts adds one outside the current
  // year). Testing the formatted string keeps this in step with the
  // formatter's own range/year rules instead of re-deriving them here.
  const whenAddsInformation = /\d{4}|–/.test(when.date);

  const factRows: PinkFactRow[] = [
    ...(whenAddsInformation
      ? [
          {
            label: f["pink.events.detail-when-label"] ?? "When",
            value: when.date,
          },
        ]
      : []),
    ...(event.location?.trim()
      ? [
          {
            label: f["pink.events.detail-where-label"] ?? "Where",
            value: event.location.trim(),
          },
        ]
      : []),
    ...(event.priceLabel?.trim()
      ? [
          {
            label: f["pink.events.detail-cost-label"] ?? "Cost",
            value: event.priceLabel.trim(),
          },
        ]
      : []),
  ];

  const hasFlier =
    Boolean(event.coverVideo?.trim()) || hasCustomImage(event.coverImage);
  const flierHint = f["pink.events.list-flier-hint"] ?? "";
  const pastBadge = firstNonBlank(f["pink.events.detail-past-badge"]);
  const scanLabel = firstNonBlank(f["pink.events.detail-scan-label"]);
  const backLabel = firstNonBlank(f["pink.events.detail-back-label"]);

  const ctaImages = [
    f["pink.events.cta-image-1"] ?? "",
    f["pink.events.cta-image-2"] ?? "",
  ].filter(hasCustomImage);

  return (
    <div className="flex flex-col">
      {/* ── The event ─────────────────────────────────────────────────── */}
      <section
        className="mx-auto w-full max-w-[1400px] px-5 pt-8 pb-16 md:px-10 md:pt-12 md:pb-24"
        aria-labelledby="pink-event-title"
        {...sectionGroupAttr("events", "detail")}
      >
        {/* `flex-nowrap` + `min-w-0` on the last crumb: a long event name
            truncates on one line instead of wrapping a lone "/ Name" under
            the trail on a phone. The H1 below carries the full name. */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5"
        >
          {[
            { label: "Home", href: "/" },
            { label: "Events", href: "/events" },
            { label: event.name },
          ].map((crumb, i) => (
            <span
              key={crumb.label + i}
              className={cn(
                "flex items-center gap-1.5",
                crumb.href ? "shrink-0" : "min-w-0",
              )}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  style={{ color: "var(--pink-subtle)" }}
                >
                  /
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[13px] transition-colors hover:opacity-80"
                  style={{ color: "var(--pink-subtle)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="min-w-0 truncate text-[13px]"
                  style={{ color: "var(--pink-subtle)" }}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Two columns from `lg`: leaf / name / blurb / stub stacked on the
            left, the flier spanning every row on the right. Below `lg` the
            same children run in one column in their `order-*` sequence:
            leaf → flier → name → blurb → stub — the flier stays high on a
            phone instead of trailing after the stub. */}
        <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-8 md:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:grid-rows-[auto_auto_auto_auto] lg:items-start">
          {/* `pt-2` on top of the row gap: more air above the heading than
              below it, so the name reads as the start of the copy, not a
              caption on the leaf. */}
          <h1
            id="pink-event-title"
            className="pink-display order-3 max-w-[18ch] pt-2 lg:order-none lg:col-start-1 lg:row-start-2"
            style={{
              fontSize: "clamp(2.125rem, 4.6vw, 3.875rem)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
              color: "var(--pink-ink)",
              textWrap: "balance",
            }}
          >
            {event.name}
          </h1>

          {/* ── Calendar leaf ───────────────────────────────────────────── */}
          <PinkReveal
            className="order-1 lg:order-none lg:col-start-1 lg:row-start-1"
            index={0}
          >
            <div
              className="relative flex flex-col gap-6 pt-5"
              style={{ borderTop: "1px solid var(--pink-ink)" }}
            >
              {isPast && pastBadge && (
                <PinkBadge tone="ink" className="absolute top-5 right-0">
                  {pastBadge}
                </PinkBadge>
              )}

              <time
                dateTime={eventDateTimeAttr(event, timeZone)}
                className="flex flex-col"
              >
                <span className="pink-eyebrow">
                  {leaf.weekday}
                  <span aria-hidden="true"> · </span>
                  <span className="sr-only">, </span>
                  {leaf.month}
                </span>
                {/* The numeral is the page's one display object. Syne 600 at
                    up to 10rem, tightened past the H1's tracking so the two
                    digits read as one shape; `lineHeight: .9` keeps the leaf
                    from opening a gap above the time line. */}
                <span
                  className="pink-display tabular-nums"
                  style={{
                    fontSize: "clamp(5.5rem, 12vw, 10rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.05em",
                    lineHeight: 0.9,
                    marginTop: "0.35rem",
                    color: isPast ? "var(--pink-subtle)" : "var(--pink-ink)",
                  }}
                >
                  {leaf.day}
                </span>
                {when.time && (
                  <span
                    className="mt-3 text-[1.0625rem] leading-[1.5]"
                    style={{ color: "var(--pink-muted)" }}
                  >
                    {when.time}
                  </span>
                )}
              </time>

              <PinkFactRows rows={factRows} surface="paper" />
            </div>
          </PinkReveal>

          {/* ── Flier ───────────────────────────────────────────────────── */}
          <PinkReveal
            className="order-2 lg:order-none lg:col-start-2 lg:row-span-4 lg:row-start-1"
            index={1}
          >
            <figure className="flex flex-col gap-3">
              <PinkEventFlier
                src={event.coverImage}
                videoSrc={event.coverVideo}
                name={event.name}
                sizes="(max-width: 1024px) 100vw, 520px"
                priority
                className={cn(hasFlier && "pink-lift")}
              />
              {hasFlier && flierHint && (
                <figcaption className="pink-label">{flierHint}</figcaption>
              )}
            </figure>
          </PinkReveal>

          {/* ── Blurb ───────────────────────────────────────────────────── */}
          {event.blurb?.trim() && (
            <p
              className="order-4 max-w-[64ch] text-[1.0625rem] leading-[1.8] whitespace-pre-line lg:order-none lg:col-start-1 lg:row-start-3"
              style={{ color: "var(--pink-body)", textWrap: "pretty" }}
            >
              {event.blurb}
            </p>
          )}

          {/* ── Ticket stub: outbound link + optional QR, then the way back.
              Hung under its own ink rule so it reads as the leaf's stub. ── */}
          <div
            className="order-5 flex flex-col gap-6 pt-6 lg:order-none lg:col-start-1 lg:row-start-4"
            style={{ borderTop: "1px solid var(--pink-ink)" }}
          >
            {event.externalUrl && (
              <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
                {/* Solid rose is the page's one primary action — while the
                    event is still coming. Once it's over the link stays
                    (recaps, photos, the organiser's page) but steps back to
                    the ghost so the badge, not a call to buy, leads. */}
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "pink-btn",
                    isPast ? "pink-btn-ghost" : "pink-btn-solid",
                  )}
                >
                  {linkLabel}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>

                <EventLinkQr
                  event={event}
                  logoUrl={business.siteContent?.logoUrl}
                  size="lg"
                  tileStyle={{
                    background: "var(--pink-white)",
                    border: "1px solid var(--pink-line)",
                  }}
                  captionClassName="flex flex-col gap-1"
                  caption={
                    <>
                      {scanLabel && (
                        <span className="pink-label">{scanLabel}</span>
                      )}
                      <span
                        className="text-[0.8125rem] leading-[1.5]"
                        style={{ color: "var(--pink-muted)" }}
                      >
                        {linkLabel}
                      </span>
                    </>
                  }
                />
              </div>
            )}

            {backLabel && (
              <Link
                href="/events"
                className="w-fit text-[14px] font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--pink-rose)" }}
                {...fieldAttr("pink.events.detail-back-label")}
              >
                <span aria-hidden="true">← </span>
                {backLabel}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Closing CTA — the events index's own panel and fields ─────── */}
      {isSectionVisible(customFields, "pink", "events.cta") && (
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 md:px-10 md:pb-20">
          <PinkReveal>
            <PinkCtaPanel
              sectionAttrs={sectionGroupAttr("events", "cta")}
              heading={f["pink.events.cta-heading"] ?? ""}
              headingFieldKey="pink.events.cta-heading"
              body={f["pink.events.cta-body"] ?? ""}
              bodyFieldKey="pink.events.cta-body"
              primaryCta={
                f["pink.events.cta-primary-label"]
                  ? {
                      label: f["pink.events.cta-primary-label"] ?? "",
                      href: f["pink.events.cta-primary-link"] ?? "/contact",
                    }
                  : undefined
              }
              images={
                ctaImages.length > 0
                  ? ctaImages.map((src) => ({ src, alt: "" }))
                  : undefined
              }
            />
          </PinkReveal>
        </div>
      )}
    </div>
  );
}
