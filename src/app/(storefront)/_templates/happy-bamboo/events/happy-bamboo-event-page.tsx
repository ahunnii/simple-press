import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see happy-bamboo-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { HappyBambooPageShelf } from "../shared/happy-bamboo-page-shelf";

/**
 * `/events/<slug>` — single-event detail. The shelf carries the event name
 * (the page's only h1), the Events heading as its leaf badge, and the flier
 * in the right frame letterboxed (`object-contain`) so a poster with words on
 * it is never cropped — video first, then image, same precedence as the
 * index; the lightbox opens it full size. The body carries Default's event
 * detail page's data logic: back link, past-event badge, date, location,
 * blurb, price, external link and `EventLinkQr`. Ends at content.
 *
 * Default's event detail page ships no editor wiring; here the body is tagged
 * with the `events.list` group, which owns the fallback link label this page
 * also reads.
 */
export function HappyBambooEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);

  // First non-blank wins — a cleared label is "" not null, so `??` would
  // render a link with no text and no accessible name. Same chain as the
  // index page, so an event's link reads the same on both.
  const linkLabel =
    [
      event.externalUrlLabel,
      f["default.events.list-link-fallback-label"],
      "More details",
    ].find((candidate) => candidate?.trim()) ?? "More details";

  const media = event.coverVideo ? (
    <EventFlierVideo src={event.coverVideo} name={event.name} />
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
          priority
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 320px"
        />
      </div>
    </EventFlierLightbox>
  ) : undefined;

  return (
    <PageTransition>
      <HappyBambooPageShelf
        title={event.name}
        smallLabel={f["default.events.hero-heading"]}
        smallLabelFieldKey="default.events.hero-heading"
        media={media}
        imageFit="contain"
      />

      <section
        className="py-16 md:py-24"
        {...sectionGroupAttr("events", "list")}
      >
        <div className="container mx-auto px-4">
          <Link
            href="/events"
            className="text-primary focus-visible:ring-primary inline-flex items-center gap-2 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All events
          </Link>

          <FadeIn className="mt-8 flex max-w-3xl flex-col gap-4 md:mt-10">
            {isPast && (
              <Badge variant="secondary" className="px-3 py-1 uppercase">
                This event has passed
              </Badge>
            )}
            <time
              dateTime={eventDateTimeAttr(event, timeZone)}
              className="text-primary inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase"
            >
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              {formatEventDate(event, timeZone, { showZone: true })}
            </time>
            {event.location && (
              <p className="text-muted-foreground inline-flex items-start gap-2">
                <MapPin
                  className="text-primary mt-1 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {event.location}
              </p>
            )}
            {event.blurb && (
              <p className="text-muted-foreground mt-2 text-lg leading-relaxed break-words whitespace-pre-line">
                {event.blurb}
              </p>
            )}
            {(!!event.priceLabel || !!event.externalUrl) && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {event.priceLabel && (
                  <span className="bg-muted text-foreground inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold">
                    {event.priceLabel}
                  </span>
                )}
                {event.externalUrl && (
                  <Button asChild size="lg">
                    <a
                      href={event.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {linkLabel}
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  </Button>
                )}
              </div>
            )}
            <EventLinkQr
              event={event}
              logoUrl={business.siteContent?.logoUrl}
              size="lg"
              className="mt-4"
              tileClassName="border-border rounded-lg border"
              captionClassName="text-muted-foreground text-sm"
            />
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
