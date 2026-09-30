import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see umsc-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UMSC_META_CLASS, UmscBackLink } from "../generic/umsc-page-kit";
import { UmscButton } from "../shared/umsc-button";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { umscEventDateParts, UmscEventFlier } from "./umsc-event-flier";

/**
 * `/events/<slug>` — single-event detail on umsc's generic page base
 * (parity PF23).
 *
 * The black `UmscPageHero` at detail scale carries "← All events", the event
 * name as the page's only h1, then the meta row (a purple "This event has
 * passed" badge, the date in the shop's zone, the location). The body sits on
 * the shared container: flier left + details right when there is media,
 * details alone at a 66ch measure on the same left edge otherwise — Default's
 * detail logic (media precedence, blurb, price, external link, `EventLinkQr`)
 * restyled. Skipped entirely when the event has none of those, so a
 * date-only event doesn't end on an empty padded strip.
 *
 * Unlike Default's detail page (no editor wiring), the band is tagged
 * `events.hero` and the body `events.list` (the group owning the fallback
 * link label used here), as noise/olive/vii do.
 */
export function UmscEventPage({
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
  const { month, day } = umscEventDateParts(event.startAt, timeZone);

  return (
    <PageTransition>
      <UmscPageHero
        compact
        sectionAttrs={sectionGroupAttr("events", "hero")}
        leading={<UmscBackLink href="/events">All events</UmscBackLink>}
        heading={event.name}
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {isPast ? (
            <p className="umsc-sans rounded-[var(--umsc-radius-pill)] bg-[var(--umsc-purple)] px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.1em] text-[var(--umsc-white)] uppercase">
              This event has passed
            </p>
          ) : null}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            className={cn(UMSC_META_CLASS, "text-[var(--umsc-gold-soft)]")}
          >
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location ? (
            <p className="umsc-sans text-[15px] text-[var(--umsc-cream-on-black)]">
              {event.location}
            </p>
          ) : null}
        </div>
      </UmscPageHero>

      {hasBody ? (
        <UmscSection
          tone="paper"
          aria-label="Event details"
          sectionAttrs={sectionGroupAttr("events", "list")}
        >
          <UmscReveal
            className={cn(
              hasMedia &&
                "grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-14",
            )}
          >
            {hasMedia ? (
              <UmscEventFlier
                name={event.name}
                coverImage={event.coverImage}
                coverVideo={event.coverVideo}
                month={month}
                day={day}
                sizes="(max-width: 768px) min(100vw, 448px), 360px"
                priority
                className="max-w-md md:max-w-none"
              />
            ) : null}

            <div className="flex min-w-0 flex-col items-start gap-6">
              {event.blurb ? (
                <p className="umsc-sans max-w-[66ch] text-[17px] leading-[1.6] whitespace-pre-line text-[var(--umsc-ink)]">
                  {event.blurb}
                </p>
              ) : null}

              {event.priceLabel || event.externalUrl ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {event.priceLabel ? (
                    <span
                      className={cn(
                        UMSC_META_CLASS,
                        "umsc-tabular text-[var(--umsc-ink)]",
                      )}
                    >
                      {event.priceLabel}
                    </span>
                  ) : null}
                  {event.externalUrl ? (
                    <UmscButton
                      as="link"
                      href={event.externalUrl}
                      external
                      variant="gold"
                    >
                      {linkLabel}
                    </UmscButton>
                  ) : null}
                </div>
              ) : null}

              <EventLinkQr
                event={event}
                logoUrl={business.siteContent?.logoUrl}
                size="lg"
                tileClassName="border border-[var(--umsc-line)] bg-[var(--umsc-white)]"
                captionClassName="umsc-sans text-[13px] text-[var(--umsc-muted)]"
              />
            </div>
          </UmscReveal>
        </UmscSection>
      ) : null}
    </PageTransition>
  );
}
