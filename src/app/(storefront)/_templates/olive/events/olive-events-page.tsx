import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not olive's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — olive's `resolveFields`
// would return "" for every one of them.
import { resolveFields as resolveDefaultFields } from "../../default";
import { OliveClosingBand } from "../generic/olive-closing-band";
import { OliveGatedButton } from "../generic/olive-gated-button";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import { OliveButton, OliveEmptyState, OliveRevealGroup } from "../shared";
import { oliveEventDateParts } from "./olive-event-date";
import { OliveEventFlier } from "./olive-event-flier";

const FIELD_KEYS = [
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

/** First non-blank string wins (a cleared field resolves to "", not null). */
function firstFilled(...candidates: (string | null | undefined)[]): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

/**
 * `/events` — olive's events index on the generic page base: the white
 * `OlivePageBand` title band, then one `OlivePageSection` of event cards on
 * the same left edge (120px at 1440, 16px at 390 — B1.2/B1.7), then the
 * hideable paper closing band.
 *
 * Data logic is Default's events page's, carried over: media precedence
 * (video → image → none, here with olive's date tile for none),
 * `formatEventDate`/`eventDateTimeAttr` in the shop's zone, the price label,
 * the external link's "first non-blank wins" label, `EventLinkQr`, the empty
 * state and the hideable `events.cta` band. Copy is Default's
 * `default.events.*` fields read through Default's resolver.
 *
 * No event cards contain a form, so the list reveals as one dealt group; the
 * closing band's button is flag-gated (B2.5).
 */
export function OliveEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";

  return (
    <>
      <OlivePageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        title={firstFilled(f["default.events.hero-heading"], "Events")}
        titleFieldKey="default.events.hero-heading"
        intro={f["default.events.hero-tagline"]}
        introFieldKey="default.events.hero-tagline"
      />

      <OlivePageSection
        flush
        aria-label="Upcoming events"
        sectionAttrs={sectionGroupAttr("events", "list")}
      >
        {events.length === 0 ? (
          <OliveEmptyState
            headingAs="h2"
            className="w-full"
            heading={firstFilled(
              f["default.events.list-empty-heading"],
              "No upcoming events",
            )}
            headingFieldKey="default.events.list-empty-heading"
            body={f["default.events.list-empty-body"]}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          <OliveRevealGroup threshold={0} className="flex flex-col gap-4">
            {events.map((event, i) => {
              // First non-blank wins — a chain of `??` would pass a cleared
              // (empty-string) label straight through and render a link with
              // no text and no accessible name.
              const linkLabel = firstFilled(
                event.externalUrlLabel,
                linkFallbackLabel,
                "More details",
              );
              const { month, day } = oliveEventDateParts(
                event.startAt,
                timeZone,
              );

              return (
                <article
                  key={event.id}
                  aria-labelledby={`olive-event-${event.id}`}
                  className="olive-card olive-reveal-item grid grid-cols-1 gap-5 p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                >
                  <OliveEventFlier
                    name={event.name}
                    coverImage={event.coverImage}
                    coverVideo={event.coverVideo}
                    month={month}
                    day={day}
                    sizes="(max-width: 640px) 320px, 220px"
                    className="max-w-[320px] sm:max-w-none"
                  />

                  <div className="flex min-w-0 flex-col items-start gap-3">
                    <time
                      dateTime={eventDateTimeAttr(event, timeZone)}
                      className="olive-label"
                      style={{ color: "var(--olive-leaf)" }}
                    >
                      {formatEventDate(event, timeZone, { showZone: true })}
                    </time>

                    <h2 id={`olive-event-${event.id}`} className="olive-h2">
                      <Link
                        href={`/events/${event.slug}`}
                        className="decoration-[var(--olive-sage-bright)] decoration-1 underline-offset-[6px] hover:underline"
                      >
                        {event.name}
                      </Link>
                    </h2>

                    {event.location ? (
                      <p
                        className="flex items-start gap-2 text-[0.875rem] leading-snug"
                        style={{ color: "var(--olive-ink-soft)" }}
                      >
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--olive-leaf)" }}
                        />
                        {event.location}
                      </p>
                    ) : null}

                    {event.blurb ? (
                      <p
                        className="text-[0.9375rem] leading-relaxed"
                        style={{
                          color: "var(--olive-ink-soft)",
                          maxWidth: "62ch",
                        }}
                      >
                        {event.blurb}
                      </p>
                    ) : null}

                    {event.priceLabel || event.externalUrl ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
                        {event.priceLabel ? (
                          <span className="olive-price">
                            {event.priceLabel}
                          </span>
                        ) : null}
                        {event.externalUrl ? (
                          <OliveButton
                            variant="secondary"
                            size="sm"
                            href={event.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {linkLabel}
                            <ArrowUpRight
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                            <span className="sr-only"> (opens in new tab)</span>
                          </OliveButton>
                        ) : null}
                      </div>
                    ) : null}

                    <EventLinkQr
                      event={event}
                      logoUrl={business.siteContent?.logoUrl}
                      size="sm"
                      className="mt-2"
                      tileClassName="rounded-[var(--olive-card-radius)] border border-[var(--olive-hairline)]"
                      captionClassName="olive-caption"
                    />
                  </div>
                </article>
              );
            })}
          </OliveRevealGroup>
        )}
      </OlivePageSection>

      {isSectionVisible(customFields, "olive", "events.cta") ? (
        <OliveClosingBand
          sectionAttrs={sectionGroupAttr("events", "cta")}
          heading={firstFilled(
            f["default.events.cta-heading"],
            "Want us at your event?",
          )}
          headingFieldKey="default.events.cta-heading"
          body={f["default.events.cta-body"]}
          bodyFieldKey="default.events.cta-body"
        >
          <OliveGatedButton
            href={firstFilled(f["default.events.cta-button-link"], "/contact")}
            label={f["default.events.cta-button-text"] ?? ""}
            labelFieldKey="default.events.cta-button-text"
          />
        </OliveClosingBand>
      ) : null}
    </>
  );
}
