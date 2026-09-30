import Link from "next/link";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not noise's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — noise's `resolveFields`
// would return "" for every one of them.
import { resolveFields as resolveDefaultFields } from "../../default";
import { NoiseClosingBand } from "../generic/noise-closing-band";
import { NoiseEmptyState } from "../generic/noise-empty-state";
import { NoiseGatedLink } from "../generic/noise-gated-link";
import {
  NOISE_META_CLASS,
  NoisePageBand,
  NoisePageBody,
} from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";
import { noiseEventDateParts, NoiseEventFlier } from "./noise-event-flier";

const FIELD_KEYS = [
  "default.events.hero-eyebrow",
  "default.events.hero-heading",
  "default.events.hero-tagline",
  "default.events.list-link-fallback-label",
  "default.events.list-empty-heading",
  "default.events.list-empty-body",
  "default.events.cta-heading",
  "default.events.cta-body",
  "default.events.cta-button-text",
  "default.events.cta-button-link",
];

/**
 * `/events` — noise's events index on the generic page base (PF12): the
 * centred title band, then the event rows on the wide container between
 * ink rules (the blog archive's rhythm), then the hideable ink closing band.
 *
 * Data logic is Default's events page's, carried over: media precedence
 * (video → image → the hatched date tile), `formatEventDate` /
 * `eventDateTimeAttr` in the shop's zone, the price label, the external
 * link's "first non-blank wins" label, `EventLinkQr`, the empty state and
 * the hideable `events.cta` band. Copy is Default's `default.events.*`
 * fields read through Default's resolver. The closing button is flag-gated
 * (B2.5).
 */
export function NoiseEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"];

  return (
    <PageTransition>
      <NoisePageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        overline={f["default.events.hero-eyebrow"]}
        overlineFieldKey="default.events.hero-eyebrow"
        title={nonBlank(f["default.events.hero-heading"]) ?? "Events"}
        titleFieldKey="default.events.hero-heading"
        intro={f["default.events.hero-tagline"]}
        introFieldKey="default.events.hero-tagline"
      />

      <NoisePageBody
        width="wide"
        aria-label="Upcoming events"
        sectionAttrs={sectionGroupAttr("events", "list")}
      >
        {events.length === 0 ? (
          <NoiseEmptyState
            heading={
              nonBlank(f["default.events.list-empty-heading"]) ??
              "No upcoming events"
            }
            headingFieldKey="default.events.list-empty-heading"
            body={f["default.events.list-empty-body"]}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          <StaggerContainer
            className="border-t-2 border-(--vn-ink)"
            staggerDelay={0.07}
          >
            {events.map((event) => {
              // First non-blank wins — a chain of `??` would pass a cleared
              // (empty-string) label straight through and render a link with
              // no text and no accessible name.
              const linkLabel =
                nonBlank(event.externalUrlLabel) ??
                nonBlank(linkFallbackLabel) ??
                "More details";
              const { month, day } = noiseEventDateParts(
                event.startAt,
                timeZone,
              );
              const hasMedia = !!event.coverImage || !!event.coverVideo;

              return (
                <StaggerItem key={event.id}>
                  <article
                    aria-labelledby={`noise-event-${event.id}`}
                    className={cn(
                      "grid gap-5 border-b border-(--vn-rule) py-10 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14",
                      // A tall poster stacks above the text on phones; the
                      // small date tile sits beside it.
                      hasMedia
                        ? "grid-cols-1"
                        : "grid-cols-[auto_minmax(0,1fr)]",
                    )}
                  >
                    <NoiseEventFlier
                      name={event.name}
                      coverImage={event.coverImage}
                      coverVideo={event.coverVideo}
                      month={month}
                      day={day}
                      sizes="(max-width: 640px) 320px, 240px"
                      className={
                        hasMedia ? "max-w-[320px] sm:max-w-none" : undefined
                      }
                    />

                    <div className="flex min-w-0 flex-col items-start gap-3">
                      <time
                        dateTime={eventDateTimeAttr(event, timeZone)}
                        className={NOISE_META_CLASS}
                      >
                        {formatEventDate(event, timeZone, { showZone: true })}
                      </time>

                      <h2
                        id={`noise-event-${event.id}`}
                        className="font-serif leading-[1.1] tracking-tight break-words italic"
                        style={{
                          fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        <Link
                          href={`/events/${event.slug}`}
                          className="underline-offset-[6px] transition-opacity hover:underline hover:opacity-70"
                        >
                          {event.name}
                        </Link>
                      </h2>

                      {event.location ? (
                        <p className="font-mono text-[11px] tracking-[0.14em] text-(--vn-ink-soft) uppercase">
                          {event.location}
                        </p>
                      ) : null}

                      {event.blurb ? (
                        <p
                          className="font-sans text-[15px] leading-[1.85] text-(--vn-ink-soft)"
                          style={{ maxWidth: "62ch" }}
                        >
                          {event.blurb}
                        </p>
                      ) : null}

                      {event.priceLabel || event.externalUrl ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
                          {event.priceLabel ? (
                            <span className="font-mono text-[12px] tracking-[0.14em] text-(--vn-ink) uppercase">
                              {event.priceLabel}
                            </span>
                          ) : null}
                          {event.externalUrl ? (
                            <a
                              href={event.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vn-stamp text-[10px] transition-colors hover:bg-(--vn-ink) hover:text-(--vn-paper)"
                            >
                              {linkLabel}
                              <span aria-hidden="true">↗</span>
                              <span className="sr-only">
                                {" "}
                                (opens in new tab)
                              </span>
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      <EventLinkQr
                        event={event}
                        logoUrl={business.siteContent?.logoUrl}
                        size="sm"
                        className="mt-2"
                        tileClassName="border border-(--vn-rule)"
                        captionClassName={NOISE_META_CLASS}
                      />
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </NoisePageBody>

      {isSectionVisible(customFields, "noise", "events.cta") ? (
        <NoiseClosingBand
          sectionAttrs={sectionGroupAttr("events", "cta")}
          heading={
            nonBlank(f["default.events.cta-heading"]) ??
            "Want us at your event?"
          }
          headingFieldKey="default.events.cta-heading"
          body={f["default.events.cta-body"]}
          bodyFieldKey="default.events.cta-body"
        >
          <NoiseGatedLink
            href={nonBlank(f["default.events.cta-button-link"]) ?? "/contact"}
            label={f["default.events.cta-button-text"] ?? ""}
            labelFieldKey="default.events.cta-button-text"
          />
        </NoiseClosingBand>
      ) : null}
    </PageTransition>
  );
}
