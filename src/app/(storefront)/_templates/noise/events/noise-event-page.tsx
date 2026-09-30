import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see noise-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  NOISE_META_CLASS,
  NoiseBackLink,
  NoisePageBand,
  NoisePageBody,
} from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";
import { noiseEventDateParts, NoiseEventFlier } from "./noise-event-flier";

/**
 * `/events/<slug>` — single-event detail on noise's generic base (PF12).
 *
 * The band follows the blog post header: a mono back link, the event name as
 * the page's only h1, then the meta row (past-event stamp, date, location).
 * The body carries Default's event detail logic — media precedence (video →
 * image → none), blurb, price, external link and `EventLinkQr` — centred
 * under the band: a flier + text pair when there is media, the 3xl measure
 * when there isn't. It's skipped entirely when the event has none of those,
 * so a date-only event doesn't end on an empty padded strip.
 *
 * Unlike Default's detail page (no editor wiring), the band is tagged
 * `events.hero` and the body `events.list` (the group owning the fallback
 * link label used here), as olive/vii do.
 */
export function NoiseEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.list-link-fallback-label",
  ]);

  // Same chain as the index page, so an event's link reads the same on both.
  const linkLabel =
    nonBlank(event.externalUrlLabel) ??
    nonBlank(f["default.events.list-link-fallback-label"]) ??
    "More details";
  const hasMedia = !!event.coverVideo || !!event.coverImage;
  const hasBody =
    hasMedia || !!event.blurb || !!event.priceLabel || !!event.externalUrl;
  const { month, day } = noiseEventDateParts(event.startAt, timeZone);

  return (
    <PageTransition>
      <NoisePageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        leading={<NoiseBackLink href="/events">← All events</NoiseBackLink>}
        title={event.name}
      >
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {isPast ? (
            <p className="vn-stamp vn-stamp-solid">This event has passed</p>
          ) : null}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            className="font-mono text-[11px] tracking-[0.18em] text-(--vn-ink) uppercase"
          >
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location ? (
            <p className="font-mono text-[11px] tracking-[0.18em] text-(--vn-steel-mist) uppercase">
              {event.location}
            </p>
          ) : null}
        </div>
      </NoisePageBand>

      {hasBody ? (
        <NoisePageBody
          width={hasMedia ? "wide" : "measure"}
          aria-label="Event details"
          sectionAttrs={sectionGroupAttr("events", "list")}
        >
          <FadeIn
            className={cn(
              hasMedia &&
                "mx-auto grid max-w-[1040px] grid-cols-1 items-start gap-10 border-t-2 border-(--vn-ink) pt-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14",
              !hasMedia && "border-t-2 border-(--vn-ink) pt-12",
            )}
          >
            {hasMedia ? (
              <NoiseEventFlier
                name={event.name}
                coverImage={event.coverImage}
                coverVideo={event.coverVideo}
                month={month}
                day={day}
                sizes="(max-width: 768px) min(100vw, 448px), 420px"
                priority
                className="max-w-md md:max-w-none"
              />
            ) : null}

            <div className="flex min-w-0 flex-col items-start gap-6">
              {event.blurb ? (
                <p
                  className="font-sans text-[15px] leading-[1.95] tracking-[0.01em] whitespace-pre-line text-(--vn-ink-soft)"
                  style={{ maxWidth: "68ch" }}
                >
                  {event.blurb}
                </p>
              ) : null}

              {event.priceLabel || event.externalUrl ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
                      className="vn-stamp vn-stamp-solid text-[10.5px] transition-opacity hover:opacity-80"
                    >
                      {linkLabel}
                      <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : null}
                </div>
              ) : null}

              <EventLinkQr
                event={event}
                logoUrl={business.siteContent?.logoUrl}
                size="lg"
                tileClassName="border border-(--vn-rule)"
                captionClassName={NOISE_META_CLASS}
              />
            </div>
          </FadeIn>
        </NoisePageBody>
      ) : null}
    </PageTransition>
  );
}
