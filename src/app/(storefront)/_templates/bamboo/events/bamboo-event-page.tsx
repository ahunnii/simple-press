import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Leaf,
  MapPin,
} from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

import { resolveFields } from "..";
// Default's resolver — see bamboo-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import {
  BAMBOO_EVENT_CHIP,
  BAMBOO_EVENT_EYEBROW,
  BAMBOO_EVENT_PILL,
} from "./bamboo-event-parts";

/**
 * `/events/<slug>` — single-event detail on bamboo's generic base. The band
 * is the shared `BambooPageHero` (carries `BAMBOO_TOP_MARKER`): back link →
 * Events-heading eyebrow → the event name as the page's only h1 → gold rule
 * → date/location meta, the same back-link → h1 → rule → meta order as the
 * blog post band. The body sits on the band's container edge: the flier
 * (uncropped, natural aspect) beside the details at lg, stacked on phones.
 *
 * Data logic is Default's event detail page's: past-event badge, media
 * precedence (video → image → none), `formatEventDate`/`eventDateTimeAttr`,
 * location, blurb, price, the external link's "first non-blank wins" label
 * and `EventLinkQr`. Like pollen's, the fallback link label also reads
 * `default.events.list-link-fallback-label` so an event's link reads the same
 * on the index and here, and the body is tagged with the `events.list` group
 * that owns that field.
 */
export function BambooEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);
  const heroBgImage = resolveFields(customFields, [
    "bamboo.global.page-hero-bg-image",
  ])["bamboo.global.page-hero-bg-image"];

  // First non-blank wins — a cleared label is "" not null, and `??` would
  // pass that straight through, rendering a link with no text and no
  // accessible name.
  const linkLabel =
    [
      event.externalUrlLabel,
      f["default.events.list-link-fallback-label"],
      "More details",
    ].find((candidate) => candidate?.trim()) ?? "More details";
  const hasMedia = !!event.coverVideo || !!event.coverImage;
  // Date and location live in the band, so an event with nothing else to
  // show skips the body instead of rendering an empty padded section.
  const hasBody =
    hasMedia || !!event.blurb || !!event.priceLabel || !!event.externalUrl;

  return (
    <PageTransition>
      <BambooPageHero
        preheader={
          <Link
            href="/events"
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring mb-8 inline-flex items-center gap-2 rounded-sm text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All events
          </Link>
        }
        eyebrow={f["default.events.hero-heading"]}
        eyebrowFieldKey="default.events.hero-heading"
        eyebrowIcon={Leaf}
        title={event.name}
        bgImage={heroBgImage}
      >
        <div className="mt-6 flex flex-col items-center gap-3 md:items-start">
          {isPast && (
            <p className="text-muted-foreground w-fit rounded-full border border-[var(--bam-hairline)] bg-[var(--bam-cream)] px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
              This event has passed
            </p>
          )}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            className={BAMBOO_EVENT_EYEBROW}
          >
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location && (
            <p className="text-muted-foreground inline-flex items-start gap-2">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-[var(--bam-forest)]"
                aria-hidden="true"
              />
              {event.location}
            </p>
          )}
        </div>
      </BambooPageHero>

      {hasBody && (
        <section {...sectionGroupAttr("events", "list")} className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn direction="up">
              <div
                className={cn(
                  hasMedia &&
                    "grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16",
                )}
              >
                {/* Flier — same media precedence as the index. The image keeps
                  its own aspect (no crop, no fixed frame); a video needs a
                  sized box for its absolutely-positioned player, so it
                  letterboxes inside a 3:4 cream-deep frame. */}
                {hasMedia && (
                  <div className="w-full max-w-md lg:max-w-none">
                    {event.coverVideo ? (
                      <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)]">
                        <EventFlierVideo
                          src={event.coverVideo}
                          name={event.name}
                        />
                      </div>
                    ) : event.coverImage ? (
                      <div className="overflow-hidden rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] shadow-sm">
                        <EventFlierLightbox
                          src={event.coverImage}
                          alt={event.name}
                          panelClassName="rounded-2xl"
                        >
                          <Image
                            src={event.coverImage}
                            alt={event.name}
                            width={1200}
                            height={1600}
                            className="h-auto w-full object-contain"
                            sizes="(max-width: 1024px) min(100vw, 448px), 480px"
                            priority
                          />
                        </EventFlierLightbox>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Details */}
                <div className="flex max-w-3xl flex-col gap-6">
                  {event.blurb ? (
                    <p className="text-foreground/80 text-lg leading-relaxed whitespace-pre-line">
                      {event.blurb}
                    </p>
                  ) : null}
                  {(!!event.priceLabel || !!event.externalUrl) && (
                    <div className="flex flex-wrap items-center gap-3">
                      {event.priceLabel && (
                        <span className={BAMBOO_EVENT_CHIP}>
                          {event.priceLabel}
                        </span>
                      )}
                      {event.externalUrl && (
                        <Button size="lg" asChild className={BAMBOO_EVENT_PILL}>
                          <a
                            href={event.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {linkLabel}
                            <ArrowRight
                              className="size-4 transition-transform group-hover:translate-x-1"
                              aria-hidden="true"
                            />
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
                    tileClassName="rounded-xl border border-[var(--bam-hairline)]"
                    captionClassName="text-muted-foreground text-sm"
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
