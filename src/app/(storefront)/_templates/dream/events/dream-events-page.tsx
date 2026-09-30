import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not dream's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — dream's `resolveFields`
// only knows them once X3 spreads `dreamEventsData` into the root registry,
// and Default's is the source of truth either way.
import { resolveFields as resolveDefaultFields } from "../../default";
import { DreamButton } from "../shared/dream-button";
import { DreamClouds } from "../shared/dream-clouds";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamRevealGroup } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";
import { dreamEventDateParts } from "./dream-event-date";
import { DreamEventFlier } from "./dream-event-flier";
import { DreamGatedButton } from "./dream-gated-button";
import { DreamOptionalEmptyState } from "./dream-optional-empty-state";
import { firstFilled, resolveDreamPageLogo } from "./dream-optional-page";

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
 * `/events` — dream's events index on the generic page base (parity PF20):
 * the same `DreamPageHero` sky band as `/<generic-slug>` (logo, the page's
 * only h1, the tagline as its lede), then one `DreamSection` of event rows
 * on the shared `--dream-container` edge, then the hideable closing band in
 * the `DreamQuoteCta` register (horizon wisps, centered h2 + lede + pill).
 *
 * Data logic is Default's events page's, carried over: media precedence
 * (video → image → none, here with dream's date tile for none),
 * `formatEventDate`/`eventDateTimeAttr` in the shop's zone, the price label,
 * the external link's "first non-blank wins" label, `EventLinkQr`, the empty
 * state and the hideable `events.cta` band. Copy is Default's
 * `default.events.*` fields read through Default's resolver.
 *
 * Rows are separated by gold hairlines (the What We Do rhythm) rather than
 * boxed as cards, and reveal as one staggered list. The closing button is
 * flag-gated (B2.5).
 */
export function DreamEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);
  const { logoUrl, logoAlt } = resolveDreamPageLogo(business);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";
  const ctaBody = f["default.events.cta-body"] ?? "";

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={firstFilled(f["default.events.hero-heading"], "Events")}
        titleFieldKey="default.events.hero-heading"
        lede={f["default.events.hero-tagline"] ?? ""}
        ledeFieldKey="default.events.hero-tagline"
        sectionAttrs={sectionGroupAttr("events", "hero")}
      />

      <DreamSection
        reveal={false}
        aria-label="Upcoming events"
        sectionAttrs={sectionGroupAttr("events", "list")}
      >
        {events.length === 0 ? (
          <DreamOptionalEmptyState
            heading={firstFilled(
              f["default.events.list-empty-heading"],
              "No upcoming events",
            )}
            headingFieldKey="default.events.list-empty-heading"
            body={f["default.events.list-empty-body"]}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          // threshold 0: a long list is taller than the viewport, and a
          // 10% threshold would keep it hidden until well into the page.
          <DreamRevealGroup threshold={0} className="flex flex-col">
            {events.map((event, i) => {
              // First non-blank wins — a chain of `??` would pass a cleared
              // (empty-string) label straight through and render a link with
              // no text and no accessible name.
              const linkLabel = firstFilled(
                event.externalUrlLabel,
                linkFallbackLabel,
                "More details",
              );
              const { month, day } = dreamEventDateParts(
                event.startAt,
                timeZone,
              );

              return (
                <article
                  key={event.id}
                  aria-labelledby={`dream-event-${event.id}`}
                  className="dream-reveal-item grid grid-cols-1 gap-6 border-t border-[var(--dream-line)] py-10 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 lg:py-14"
                  style={{ "--i": Math.min(i, 7) } as CSSProperties}
                >
                  <DreamEventFlier
                    name={event.name}
                    coverImage={event.coverImage}
                    coverVideo={event.coverVideo}
                    month={month}
                    day={day}
                    sizes="(max-width: 640px) 320px, 240px"
                    className="max-w-[320px] sm:max-w-none"
                  />

                  <div className="flex min-w-0 flex-col items-start gap-3">
                    <time
                      dateTime={eventDateTimeAttr(event, timeZone)}
                      className="text-[15px] font-semibold text-[var(--dream-gold-ink)]"
                    >
                      {formatEventDate(event, timeZone, { showZone: true })}
                    </time>

                    <h2
                      id={`dream-event-${event.id}`}
                      className="text-[clamp(26px,2.6vw,34px)] leading-[1.1]"
                    >
                      <Link
                        href={`/events/${event.slug}`}
                        className="decoration-[var(--dream-rose)] decoration-1 underline-offset-[6px] hover:underline"
                      >
                        {event.name}
                      </Link>
                    </h2>

                    {event.location ? (
                      <p className="flex items-start gap-2 text-[15px] leading-snug text-[var(--dream-soft)]">
                        <MapPin
                          aria-hidden="true"
                          strokeWidth={1.5}
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dream-gold-ink)]"
                        />
                        {event.location}
                      </p>
                    ) : null}

                    {event.blurb ? (
                      <p className="max-w-[62ch] text-[17px] leading-[1.7] text-[var(--dream-soft)]">
                        {event.blurb}
                      </p>
                    ) : null}

                    {event.priceLabel || event.externalUrl ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
                        {event.priceLabel ? (
                          <span className="rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-white)] px-4 py-1.5 text-[14px] font-semibold text-[var(--dream-ink)]">
                            {event.priceLabel}
                          </span>
                        ) : null}
                        {event.externalUrl ? (
                          <DreamButton
                            href={event.externalUrl}
                            variant="secondary"
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
                      size="sm"
                      className="mt-3"
                      tileClassName="rounded-[var(--dream-radius-input)] border border-[var(--dream-line)]"
                      captionClassName="text-[13px] text-[var(--dream-soft)]"
                    />
                  </div>
                </article>
              );
            })}
          </DreamRevealGroup>
        )}
      </DreamSection>

      {isSectionVisible(customFields, "dream", "events.cta") ? (
        <section
          {...sectionGroupAttr("events", "cta")}
          className="dream-quote-band"
        >
          <DreamClouds variant="horizon" className="dream-quote-band-clouds" />
          <div className="dream-quote-band-content">
            <DreamHeading as="h2" fieldKey="default.events.cta-heading">
              {firstFilled(
                f["default.events.cta-heading"],
                "Want us at your event?",
              )}
            </DreamHeading>
            {ctaBody.trim() ? (
              <p
                className="dream-quote-band-lede"
                {...fieldAttr("default.events.cta-body")}
              >
                {ctaBody}
              </p>
            ) : null}
            <DreamGatedButton
              href={firstFilled(
                f["default.events.cta-button-link"],
                "/contact",
              )}
              label={f["default.events.cta-button-text"] ?? ""}
              labelFieldKey="default.events.cta-button-text"
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
