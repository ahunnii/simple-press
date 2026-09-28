import { ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see olive-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import { OliveBreadcrumb, OliveButton, OliveReveal } from "../shared";
import { oliveEventDateParts } from "./olive-event-date";
import { OliveEventFlier } from "./olive-event-flier";

/** First non-blank string wins (a cleared field resolves to "", not null). */
function firstFilled(...candidates: (string | null | undefined)[]): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

/**
 * `/events/<slug>` — single-event detail on olive's generic base.
 *
 * The band is the generic page's white `OlivePageBand`: a breadcrumb back to
 * the Events page (its first crumb is the Events page heading), the event
 * name as the page's only h1, and the date / location / past-event note
 * underneath. The body carries Default's event detail page's data logic —
 * media precedence (video → image → none), blurb, price, external link and
 * `EventLinkQr` — in one `OlivePageSection` on the same edge. It's skipped
 * when the event has none of those, so a date-only event doesn't end on an
 * empty padded strip.
 *
 * Unlike Default's detail page (no editor wiring), the band is tagged
 * `events.hero` (its breadcrumb shows that group's heading) and the body
 * `events.list` (the group owning the fallback link label used here).
 */
export function OliveEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);

  // Same chain as the index page, so an event's link reads the same on both.
  const linkLabel = firstFilled(
    event.externalUrlLabel,
    f["default.events.list-link-fallback-label"],
    "More details",
  );
  const eventsHeading = firstFilled(f["default.events.hero-heading"], "Events");
  const hasMedia = !!event.coverVideo || !!event.coverImage;
  const hasBody =
    hasMedia || !!event.blurb || !!event.priceLabel || !!event.externalUrl;
  const { month, day } = oliveEventDateParts(event.startAt, timeZone);

  return (
    <>
      <OlivePageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        leading={
          <OliveBreadcrumb
            items={[
              { label: eventsHeading, href: "/events" },
              { label: event.name },
            ]}
          />
        }
        title={event.name}
      >
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          {isPast ? (
            <p
              className="olive-label"
              style={{
                padding: "0.375rem 0.75rem",
                backgroundColor: "var(--olive-paper)",
                border: "1px solid var(--olive-hairline-strong)",
                borderRadius: "999px",
                color: "var(--olive-ink)",
              }}
            >
              This event has passed
            </p>
          ) : null}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            className="olive-label"
            style={{ color: "var(--olive-leaf)" }}
          >
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location ? (
            <p
              className="flex items-start gap-2 text-[0.9375rem] leading-snug"
              style={{ color: "var(--olive-ink-soft)" }}
            >
              <MapPin
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--olive-leaf)" }}
              />
              {event.location}
            </p>
          ) : null}
        </div>
      </OlivePageBand>

      {hasBody ? (
        <OlivePageSection
          flush
          aria-label="Event details"
          sectionAttrs={sectionGroupAttr("events", "list")}
        >
          <OliveReveal threshold={0}>
            <div
              className={
                hasMedia
                  ? "grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
                  : undefined
              }
            >
              {hasMedia ? (
                <OliveEventFlier
                  name={event.name}
                  coverImage={event.coverImage}
                  coverVideo={event.coverVideo}
                  month={month}
                  day={day}
                  sizes="(max-width: 1024px) min(100vw, 448px), 480px"
                  priority
                  className="max-w-md lg:max-w-none"
                />
              ) : null}

              <div
                className="flex min-w-0 flex-col items-start gap-5"
                style={{ maxWidth: "68ch" }}
              >
                {event.blurb ? (
                  <p
                    className="text-base leading-relaxed"
                    style={{
                      color: "var(--olive-ink-soft)",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {event.blurb}
                  </p>
                ) : null}

                {event.priceLabel || event.externalUrl ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {event.priceLabel ? (
                      <span className="olive-price">{event.priceLabel}</span>
                    ) : null}
                    {event.externalUrl ? (
                      <OliveButton
                        variant="primary"
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
                  size="lg"
                  className="mt-1"
                  tileClassName="rounded-[var(--olive-card-radius)] border border-[var(--olive-hairline)]"
                  captionClassName="olive-caption"
                />
              </div>
            </div>
          </OliveReveal>
        </OlivePageSection>
      ) : null}
    </>
  );
}
