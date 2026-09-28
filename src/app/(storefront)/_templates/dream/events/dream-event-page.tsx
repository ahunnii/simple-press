import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see dream-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { DreamButton } from "../shared/dream-button";
import { DreamLink } from "../shared/dream-link";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamReveal } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";
import { dreamEventDateParts } from "./dream-event-date";
import { DreamEventFlier } from "./dream-event-flier";
import { firstFilled, resolveDreamPageLogo } from "./dream-optional-page";

/**
 * `/events/<slug>` — single-event detail on dream's generic page base.
 *
 * The band is the generic page's `DreamPageHero`: the event name as the
 * page's only h1, then — in the hero's centered stack, where the lede would
 * sit — the past-event note, the date in gold-ink and the location, and a
 * link back to the Events page (labelled with that page's heading field).
 * The event image is deliberately NOT a cover band (a flier carries its own
 * words and must not be cropped under a scrim — same call as pollen/olive).
 *
 * The body carries Default's event detail page's data logic — media
 * precedence (video → image → none), blurb, price, external link and
 * `EventLinkQr` — in one `DreamSection` on the container edge. It's
 * skipped when the event has none of those, so a date-only event doesn't
 * end on an empty padded strip.
 *
 * Unlike Default's detail page (no editor wiring), the band is tagged
 * `events.hero` (its back link shows that group's heading) and the body
 * `events.list` (the group owning the fallback link label used here).
 */
export function DreamEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);
  const { logoUrl, logoAlt } = resolveDreamPageLogo(business);

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
  const { month, day } = dreamEventDateParts(event.startAt, timeZone);

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={event.name}
        lede=""
        sectionAttrs={sectionGroupAttr("events", "hero")}
      >
        <div className="flex flex-col items-center gap-3">
          {isPast ? (
            <p className="rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-paper)] px-4 py-1.5 text-[14px] font-semibold text-[var(--dream-ink)]">
              This event has passed
            </p>
          ) : null}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            className="text-[17px] font-semibold text-[var(--dream-gold-ink)]"
          >
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location ? (
            <p className="flex items-start gap-2 text-[17px] leading-snug text-[var(--dream-soft)]">
              <MapPin
                aria-hidden="true"
                strokeWidth={1.5}
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dream-gold-ink)]"
              />
              {event.location}
            </p>
          ) : null}
          <DreamLink
            href="/events"
            className="mt-2 inline-flex items-center gap-2 text-[15px]"
          >
            <ArrowLeft
              aria-hidden="true"
              strokeWidth={1.5}
              className="h-4 w-4"
            />
            <span {...fieldAttr("default.events.hero-heading")}>
              {eventsHeading}
            </span>
          </DreamLink>
        </div>
      </DreamPageHero>

      {hasBody ? (
        <DreamSection
          reveal={false}
          aria-label="Event details"
          sectionAttrs={sectionGroupAttr("events", "list")}
        >
          <DreamReveal threshold={0}>
            <div
              className={
                hasMedia
                  ? "grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
                  : undefined
              }
            >
              {hasMedia ? (
                <DreamEventFlier
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

              <div className="flex max-w-[66ch] min-w-0 flex-col items-start gap-6">
                {event.blurb ? (
                  <p className="text-[18px] leading-[1.7] whitespace-pre-line text-[var(--dream-ink)]">
                    {event.blurb}
                  </p>
                ) : null}

                {event.priceLabel || event.externalUrl ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    {event.priceLabel ? (
                      <span className="rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-white)] px-4 py-1.5 text-[14px] font-semibold text-[var(--dream-ink)]">
                        {event.priceLabel}
                      </span>
                    ) : null}
                    {event.externalUrl ? (
                      <DreamButton
                        href={event.externalUrl}
                        variant="primary"
                        external
                      >
                        {linkLabel}
                        <ArrowUpRight
                          aria-hidden="true"
                          strokeWidth={1.5}
                          className="h-4 w-4"
                        />
                      </DreamButton>
                    ) : null}
                  </div>
                ) : null}

                <EventLinkQr
                  event={event}
                  logoUrl={business.siteContent?.logoUrl}
                  size="lg"
                  tileClassName="rounded-[var(--dream-radius-input)] border border-[var(--dream-line)]"
                  captionClassName="text-[14px] text-[var(--dream-soft)]"
                />
              </div>
            </div>
          </DreamReveal>
        </DreamSection>
      ) : null}
    </>
  );
}
