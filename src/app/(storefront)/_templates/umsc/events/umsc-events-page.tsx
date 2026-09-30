import Link from "next/link";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not umsc's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscGatedLink } from "../generic/umsc-gated-link";
import {
  UMSC_META_CLASS,
  UmscClosingBand,
  UmscEmptyState,
} from "../generic/umsc-page-kit";
import { UmscButton } from "../shared/umsc-button";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { umscEventDateParts, UmscEventFlier } from "./umsc-event-flier";

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

/**
 * `/events` — umsc's events index on the generic page base (parity PF23):
 * the black `UmscPageHero`, then the event rows on the shared `UmscSection`
 * container between hairlines (flier or date tile left, details right), then
 * the hideable black closing band.
 *
 * Data logic is Default's events page's, carried over: media precedence
 * (video → image → the cream date tile), `formatEventDate` /
 * `eventDateTimeAttr` in the shop's zone, the price label, the external
 * link's "first non-blank wins" label, `EventLinkQr`, the empty state and
 * the hideable `events.cta` band. Copy is Default's `default.events.*`
 * fields read through Default's resolver. The closing button is flag-gated
 * (B2.5).
 */
export function UmscEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);
  const linkFallbackLabel = f["default.events.list-link-fallback-label"];

  return (
    <PageTransition>
      <UmscPageHero
        heading={nonBlank(f["default.events.hero-heading"]) ?? "Events"}
        headingFieldKey="default.events.hero-heading"
        lede={f["default.events.hero-tagline"] ?? ""}
        ledeFieldKey="default.events.hero-tagline"
        sectionAttrs={sectionGroupAttr("events", "hero")}
      />

      <UmscSection
        tone="paper"
        aria-label="Upcoming events"
        sectionAttrs={sectionGroupAttr("events", "list")}
      >
        {events.length === 0 ? (
          <UmscEmptyState
            heading={
              nonBlank(f["default.events.list-empty-heading"]) ??
              "No upcoming events"
            }
            headingFieldKey="default.events.list-empty-heading"
            body={f["default.events.list-empty-body"]}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          <UmscRevealGroup className="border-t border-[var(--umsc-line)]">
            {events.map((event, i) => {
              // First non-blank wins — a chain of `??` would pass a cleared
              // (empty-string) label straight through and render a link with
              // no text and no accessible name.
              const linkLabel =
                nonBlank(event.externalUrlLabel) ??
                nonBlank(linkFallbackLabel) ??
                "More details";
              const { month, day } = umscEventDateParts(
                event.startAt,
                timeZone,
              );
              const hasMedia = !!event.coverImage || !!event.coverVideo;

              return (
                <article
                  key={event.id}
                  aria-labelledby={`umsc-event-${event.id}`}
                  className={cn(
                    "umsc-reveal-item grid gap-6 border-b border-[var(--umsc-line)] py-10 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14",
                    // A tall poster stacks above the text on phones; the
                    // small date tile sits beside it.
                    hasMedia ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]",
                  )}
                  style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
                >
                  <UmscEventFlier
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
                      className={cn(
                        UMSC_META_CLASS,
                        "text-[var(--umsc-gold-ink)]",
                      )}
                    >
                      {formatEventDate(event, timeZone, { showZone: true })}
                    </time>

                    <h2
                      id={`umsc-event-${event.id}`}
                      className="umsc-serif text-[clamp(24px,2.6vw,34px)] leading-[1.15] font-normal tracking-[0.015em] text-balance break-words"
                    >
                      <Link
                        href={`/events/${event.slug}`}
                        className="text-[var(--umsc-ink)] underline-offset-[0.18em] hover:underline"
                      >
                        {event.name}
                      </Link>
                    </h2>

                    {event.location ? (
                      <p className="umsc-sans text-[15px] text-[var(--umsc-muted)]">
                        {event.location}
                      </p>
                    ) : null}

                    {event.blurb ? (
                      <p className="umsc-sans max-w-[62ch] text-[17px] leading-[1.6] text-[var(--umsc-ink)]">
                        {event.blurb}
                      </p>
                    ) : null}

                    {event.priceLabel || event.externalUrl ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
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
                            variant="ghost"
                          >
                            {linkLabel}
                          </UmscButton>
                        ) : null}
                      </div>
                    ) : null}

                    <EventLinkQr
                      event={event}
                      logoUrl={business.siteContent?.logoUrl}
                      size="sm"
                      className="mt-2"
                      tileClassName="border border-[var(--umsc-line)] bg-[var(--umsc-white)]"
                      captionClassName="umsc-sans text-[13px] text-[var(--umsc-muted)]"
                    />
                  </div>
                </article>
              );
            })}
          </UmscRevealGroup>
        )}
      </UmscSection>

      {isSectionVisible(customFields, "umsc", "events.cta") ? (
        <UmscClosingBand
          sectionAttrs={sectionGroupAttr("events", "cta")}
          heading={
            nonBlank(f["default.events.cta-heading"]) ??
            "Want us at your event?"
          }
          headingFieldKey="default.events.cta-heading"
          body={f["default.events.cta-body"]}
          bodyFieldKey="default.events.cta-body"
        >
          <UmscGatedLink
            href={nonBlank(f["default.events.cta-button-link"]) ?? "/contact"}
            label={f["default.events.cta-button-text"] ?? ""}
            labelFieldKey="default.events.cta-button-text"
          />
        </UmscClosingBand>
      ) : null}
    </PageTransition>
  );
}
