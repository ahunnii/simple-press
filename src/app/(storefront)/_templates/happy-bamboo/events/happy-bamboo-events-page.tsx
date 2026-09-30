import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver: these pages keep reading the existing `default.events.*`
// keys (owner-saved copy carries over untouched) and Default's field map owns
// their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { HappyBambooPageShelf } from "../shared/happy-bamboo-page-shelf";

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

const LINK_FOCUS =
  "focus-visible:ring-primary rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * `/events` — happy-bamboo's events index on the shared page shelf (eyebrow
 * → leaf badge, heading → h1, tagline → intro), with Default's events page's
 * data logic carried over verbatim: media precedence (video → image →
 * none), `formatEventDate`/`eventDateTimeAttr`, price label, the external
 * link's "first non-blank wins" label, `EventLinkQr`, and the empty state.
 * Ends on its own hideable `events.cta` banner, styled as the services
 * index's closing banner.
 */
export function HappyBambooEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);

  // `resolveFields` returns "" for a cleared key, so fallbacks test for blank.
  const heading = (f["default.events.hero-heading"] ?? "").trim() || "Events";
  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";
  const emptyHeading =
    (f["default.events.list-empty-heading"] ?? "").trim() ||
    "No upcoming events";
  const emptyBody = f["default.events.list-empty-body"] ?? "";

  const ctaHeading =
    (f["default.events.cta-heading"] ?? "").trim() || "Want us at your event?";
  const ctaBody = f["default.events.cta-body"] ?? "";
  const ctaButtonText =
    (f["default.events.cta-button-text"] ?? "").trim() || "Get in touch";
  const ctaButtonLink =
    (f["default.events.cta-button-link"] ?? "").trim() || "/contact";

  return (
    <PageTransition>
      <HappyBambooPageShelf
        title={heading}
        titleFieldKey="default.events.hero-heading"
        smallLabel={f["default.events.hero-eyebrow"]}
        smallLabelFieldKey="default.events.hero-eyebrow"
        subtitle={f["default.events.hero-tagline"]}
        subtitleFieldKey="default.events.hero-tagline"
        sectionAttrs={sectionGroupAttr("events", "hero")}
      />

      {/* Event list */}
      <section
        className="py-16 md:py-24"
        {...sectionGroupAttr("events", "list")}
      >
        <div className="container mx-auto px-4">
          {events.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarDays
                  className="text-muted-foreground/50 mb-4 h-12 w-12"
                  aria-hidden="true"
                />
                <p
                  className="text-muted-foreground text-lg"
                  {...fieldAttr("default.events.list-empty-heading")}
                >
                  {emptyHeading}
                </p>
                {!!emptyBody && (
                  <p
                    className="text-muted-foreground mt-2 text-sm"
                    {...fieldAttr("default.events.list-empty-body")}
                  >
                    {emptyBody}
                  </p>
                )}
              </div>
            </FadeIn>
          ) : (
            <div className="flex flex-col gap-8">
              {events.map((event) => {
                // First non-blank wins. A chain of `??` would be wrong: a
                // cleared per-event label or fallback field is "", not null,
                // and `??` would pass it through — a link with no text and
                // no accessible name.
                const linkLabel =
                  [
                    event.externalUrlLabel,
                    linkFallbackLabel,
                    "More details",
                  ].find((candidate) => candidate?.trim()) ?? "More details";
                const hasMedia = !!event.coverVideo || !!event.coverImage;

                return (
                  <FadeIn key={event.id}>
                    <article
                      className={
                        hasMedia
                          ? "border-border bg-card grid grid-cols-1 overflow-hidden rounded-2xl border shadow-sm sm:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]"
                          : "border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
                      }
                    >
                      {/* Flier — video first, then image. Both letterbox
                          (object-contain) in a 3:4 frame so a poster with
                          words on it is never cropped; the lightbox opens it
                          full size. */}
                      {hasMedia && (
                        <div className="bg-muted/50 relative aspect-3/4 overflow-hidden">
                          {event.coverVideo ? (
                            <EventFlierVideo
                              src={event.coverVideo}
                              name={event.name}
                            />
                          ) : event.coverImage ? (
                            <EventFlierLightbox
                              src={event.coverImage}
                              alt={event.name}
                              panelClassName="rounded-xl"
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
                      <div className="flex min-w-0 flex-col gap-3 p-6 md:p-8">
                        <time
                          dateTime={eventDateTimeAttr(event, timeZone)}
                          className="text-primary inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase"
                        >
                          <CalendarDays
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          {formatEventDate(event, timeZone, { showZone: true })}
                        </time>
                        <h2 className="text-xl font-bold break-words md:text-2xl">
                          <Link
                            href={`/events/${event.slug}`}
                            className={`hover:text-primary transition-colors ${LINK_FOCUS}`}
                          >
                            {event.name}
                          </Link>
                        </h2>
                        {event.location && (
                          <p className="text-muted-foreground inline-flex items-start gap-2 text-sm">
                            <MapPin
                              className="text-primary mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            {event.location}
                          </p>
                        )}
                        {event.blurb && (
                          <p className="text-muted-foreground max-w-3xl leading-relaxed">
                            {event.blurb}
                          </p>
                        )}
                        {(!!event.priceLabel || !!event.externalUrl) && (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {event.priceLabel && (
                              <span className="bg-muted text-foreground inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold">
                                {event.priceLabel}
                              </span>
                            )}
                            {event.externalUrl && (
                              <Button asChild>
                                <a
                                  href={event.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {linkLabel}
                                  <span className="sr-only">
                                    {" "}
                                    (opens in new tab)
                                  </span>
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                        <EventLinkQr
                          event={event}
                          logoUrl={business.siteContent?.logoUrl}
                          size="sm"
                          className="mt-3"
                          tileClassName="border-border rounded-lg border"
                          captionClassName="text-muted-foreground text-xs"
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

      {/* Closing banner — the page's own ending */}
      {isSectionVisible(customFields, "happy-bamboo", "events.cta") && (
        <section
          className="py-16 md:py-24"
          {...sectionGroupAttr("events", "cta")}
        >
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-4 font-serif text-2xl font-bold md:text-3xl">
                  <span
                    className="font-serif"
                    {...fieldAttr("default.events.cta-heading")}
                  >
                    {ctaHeading}
                  </span>
                </h2>
                {!!ctaBody && (
                  <p
                    className="text-muted-foreground mb-8 leading-relaxed"
                    {...fieldAttr("default.events.cta-body")}
                  >
                    {ctaBody}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild size="lg">
                    <Link href={ctaButtonLink}>
                      <span {...fieldAttr("default.events.cta-button-text")}>
                        {ctaButtonText}
                      </span>
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
