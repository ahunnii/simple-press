import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { FadeIn } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not pollen's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — pollen's `resolveFields`
// would return "" for every one of them.
import { resolveFields as resolveDefaultFields } from "../../default";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

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

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[#215935] focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * `/events` — pollen's events index, built on the generic base
 * (`PollenGeneralLayout`'s green title band + the max-w-7xl container) with
 * the data logic of Default's events page carried over verbatim: media precedence
 * (video → image → none), `formatEventDate`/`eventDateTimeAttr`, price label,
 * the external-link "first non-blank wins" label, `EventLinkQr`, and the
 * empty state. The page ends on its own `events.cta` band, so the global
 * pollen CTA is off here (`showCTA={false}`, parity decision 2026-09-27).
 */
export function PollenEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";
  const tagline = f["default.events.hero-tagline"] ?? "";

  return (
    <PollenGeneralLayout
      business={business}
      title={f["default.events.hero-heading"] ?? "Events"}
      subtitle={f["default.events.hero-eyebrow"] ?? ""}
      titleFieldKey="default.events.hero-heading"
      subtitleFieldKey="default.events.hero-eyebrow"
      sectionAttrs={sectionGroupAttr("events", "hero")}
      showCTA={false}
    >
      {/* ── Event list ─────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("events", "list")}
        className="bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* The band has no slot for a tagline, so it opens the body —
              left-aligned to the list's edge, capped at a readable measure. */}
          {tagline && (
            <FadeIn direction="up" className="mb-12 md:mb-16">
              <p
                className="max-w-3xl text-lg leading-relaxed text-[#4b5563] md:text-xl"
                {...fieldAttr("default.events.hero-tagline")}
              >
                {tagline}
              </p>
            </FadeIn>
          )}

          {events.length === 0 ? (
            <FadeIn direction="up">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f5f2ee] px-6 py-24 text-center">
                <CalendarDays
                  className="mb-4 h-10 w-10 text-[#215935]/60"
                  aria-hidden="true"
                />
                <p
                  className="text-lg font-semibold text-[#374151]"
                  {...fieldAttr("default.events.list-empty-heading")}
                >
                  {f["default.events.list-empty-heading"] ??
                    "No upcoming events"}
                </p>
                {f["default.events.list-empty-body"] && (
                  <p
                    className="mt-2 max-w-md text-sm leading-relaxed text-[#6b7280]"
                    {...fieldAttr("default.events.list-empty-body")}
                  >
                    {f["default.events.list-empty-body"]}
                  </p>
                )}
              </div>
            </FadeIn>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {events.map((event) => {
                // First non-blank wins. A chain of `??` would be wrong here:
                // an owner who clears the per-event label or the template's
                // fallback field leaves an empty string behind, not null, and
                // `??` passes that straight through — rendering a link with no
                // text and no accessible name.
                const linkLabel =
                  [
                    event.externalUrlLabel,
                    linkFallbackLabel,
                    "More details",
                  ].find((candidate) => candidate?.trim()) ?? "More details";
                const hasMedia = !!event.coverVideo || !!event.coverImage;

                return (
                  <FadeIn key={event.id} direction="up">
                    <article
                      className={
                        hasMedia
                          ? "grid grid-cols-1 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm sm:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]"
                          : "overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm"
                      }
                    >
                      {/* Flier — one media slot per event, video first. Both
                          media types letterbox (object-contain) inside the
                          3:4 frame on pollen's cream, so no poster is ever
                          cropped; the lightbox opens it full size. */}
                      {hasMedia && (
                        <div className="relative aspect-3/4 overflow-hidden bg-[#f5f2ee]">
                          {event.coverVideo ? (
                            <EventFlierVideo
                              src={event.coverVideo}
                              name={event.name}
                            />
                          ) : event.coverImage ? (
                            <EventFlierLightbox
                              src={event.coverImage}
                              alt={event.name}
                              panelClassName="rounded-2xl"
                            >
                              <div className="relative aspect-3/4 w-full">
                                <Image
                                  src={event.coverImage}
                                  alt={event.name}
                                  fill
                                  className="object-contain transition-transform duration-500 motion-safe:hover:scale-105"
                                  sizes="(max-width: 640px) 100vw, 300px"
                                />
                              </div>
                            </EventFlierLightbox>
                          ) : null}
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex flex-col gap-3 p-6 md:p-8">
                        <time
                          dateTime={eventDateTimeAttr(event, timeZone)}
                          className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider text-[#5e7747] uppercase"
                        >
                          <CalendarDays
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          {formatEventDate(event, timeZone, { showZone: true })}
                        </time>
                        <h2 className="text-2xl font-bold text-balance text-[#374151] md:text-3xl">
                          <Link
                            href={`/events/${event.slug}`}
                            className={`rounded-sm transition-colors hover:text-[#215935] ${FOCUS_RING}`}
                          >
                            {event.name}
                          </Link>
                        </h2>
                        {event.location && (
                          <p className="inline-flex items-start gap-2 text-[15px] text-[#6b7280]">
                            <MapPin
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#215935]"
                              aria-hidden="true"
                            />
                            {event.location}
                          </p>
                        )}
                        {event.blurb && (
                          <p className="max-w-3xl leading-relaxed text-[#4b5563]">
                            {event.blurb}
                          </p>
                        )}
                        {(!!event.priceLabel || !!event.externalUrl) && (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {event.priceLabel && (
                              <span className="inline-flex items-center rounded-full bg-[#f5f2ee] px-4 py-1.5 text-sm font-semibold text-[#2a351f]">
                                {event.priceLabel}
                              </span>
                            )}
                            {event.externalUrl && (
                              <a
                                href={event.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex h-11 items-center justify-center rounded-full bg-[#215935] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1a4729] ${FOCUS_RING}`}
                              >
                                {linkLabel}
                                <span className="sr-only">
                                  {" "}
                                  (opens in new tab)
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                        <EventLinkQr
                          event={event}
                          logoUrl={business.siteContent?.logoUrl}
                          size="sm"
                          className="mt-3"
                          tileClassName="rounded-xl border border-[#e5e7eb]"
                          captionClassName="text-xs text-[#6b7280]"
                        />
                      </div>
                    </article>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Bottom CTA — the page's own ending (global CTA is off) ───────── */}
      {isSectionVisible(customFields, "pollen", "events.cta") && (
        <section
          {...sectionGroupAttr("events", "cta")}
          className="bg-white pb-20 md:pb-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              <div className="rounded-2xl bg-[#2a351f] px-6 py-16 text-center sm:px-12 md:py-20">
                <div className="mx-auto max-w-2xl">
                  <h2
                    className="text-3xl leading-tight font-bold text-balance text-white md:text-4xl"
                    {...fieldAttr("default.events.cta-heading")}
                  >
                    {f["default.events.cta-heading"] ??
                      "Want us at your event?"}
                  </h2>
                  {f["default.events.cta-body"] && (
                    <p
                      className="mx-auto mt-4 max-w-xl leading-relaxed text-white/85 md:text-lg"
                      {...fieldAttr("default.events.cta-body")}
                    >
                      {f["default.events.cta-body"]}
                    </p>
                  )}
                  <div className="mt-8">
                    <Link
                      href={f["default.events.cta-button-link"] ?? "/contact"}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[#A8D081] px-8 text-base font-semibold text-[#2a351f] shadow-lg transition-colors hover:bg-[#bddc9d] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a351f] focus-visible:outline-none"
                      {...fieldAttr("default.events.cta-button-text")}
                    >
                      {f["default.events.cta-button-text"] ?? "Get in touch"}
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PollenGeneralLayout>
  );
}
