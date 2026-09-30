import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see pollen-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[#215935] focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * `/events/<slug>` — single-event detail on pollen's generic base. The band
 * is the standard `PollenGeneralLayout` one (site header background + the
 * event name as the page's only h1; the event image is deliberately NOT the
 * band background — parity decision 2026-09-27). The body carries
 * Default's event detail page's data logic: back link, past-event badge, media
 * precedence (video → image → none), date, location, blurb, price, external
 * link and `EventLinkQr`. The poster is shown uncropped at its natural
 * aspect beside the details at lg, stacked above them on phones.
 *
 * Unlike Default's event detail page (which ships no editor wiring), the body is
 * tagged with the `events.list` group — the group that owns the fallback
 * link label this page also uses — and the band eyebrow reads the Events
 * page heading, the same way the blog post band reads "Blog".
 */
export function PollenEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);

  // First non-blank wins — see pollen-events-page.tsx for why a chain of
  // `??` would be wrong here: a cleared label is "" not null, and `??` would
  // pass that straight through, rendering a link with no text and no
  // accessible name. Same chain as the index page, so an event's link reads
  // the same on both.
  const linkLabel =
    [
      event.externalUrlLabel,
      f["default.events.list-link-fallback-label"],
      "More details",
    ].find((candidate) => candidate?.trim()) ?? "More details";
  const hasMedia = !!event.coverVideo || !!event.coverImage;

  return (
    <PollenGeneralLayout
      business={business}
      title={event.name}
      subtitle={f["default.events.hero-heading"] ?? ""}
      subtitleFieldKey="default.events.hero-heading"
    >
      <section
        {...sectionGroupAttr("events", "list")}
        className="bg-white py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className={`inline-flex items-center gap-2 rounded-sm text-sm font-medium text-[#215935] hover:text-[#1a4729] hover:underline ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All events
          </Link>

          <FadeIn direction="up">
            <div
              className={
                hasMedia
                  ? "mt-8 grid grid-cols-1 items-start gap-10 md:mt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
                  : "mt-8 md:mt-10"
              }
            >
              {/* Flier — same media precedence as the events index: video
                  first, then image, then nothing. The image keeps its own
                  aspect (no crop, no fixed frame); a video needs a sized box
                  for its absolutely-positioned player, so it letterboxes
                  (object-contain) inside a 3:4 cream frame. */}
              {hasMedia && (
                <div className="w-full max-w-md lg:max-w-none">
                  {event.coverVideo ? (
                    <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-[#f5f2ee]">
                      <EventFlierVideo
                        src={event.coverVideo}
                        name={event.name}
                      />
                    </div>
                  ) : event.coverImage ? (
                    <div className="overflow-hidden rounded-2xl bg-[#f5f2ee] shadow-sm">
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
              <div className="flex max-w-3xl flex-col gap-4">
                {isPast && (
                  <p className="w-fit rounded-full border border-[#2a351f]/15 bg-[#f5f2ee] px-4 py-1.5 text-xs font-semibold tracking-wider text-[#2a351f] uppercase">
                    This event has passed
                  </p>
                )}
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
                {event.location && (
                  <p className="inline-flex items-start gap-2 text-base text-[#6b7280]">
                    <MapPin
                      className="mt-1 h-4 w-4 shrink-0 text-[#215935]"
                      aria-hidden="true"
                    />
                    {event.location}
                  </p>
                )}
                {event.blurb && (
                  <p className="mt-2 text-lg leading-relaxed whitespace-pre-line text-[#4b5563]">
                    {event.blurb}
                  </p>
                )}
                {(!!event.priceLabel || !!event.externalUrl) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
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
                        className={`inline-flex h-12 items-center justify-center rounded-full bg-[#215935] px-8 text-base font-medium text-white transition-colors hover:bg-[#1a4729] ${FOCUS_RING}`}
                      >
                        {linkLabel}
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    )}
                  </div>
                )}
                <EventLinkQr
                  event={event}
                  logoUrl={business.siteContent?.logoUrl}
                  size="lg"
                  className="mt-4"
                  tileClassName="rounded-xl border border-[#e5e7eb]"
                  captionClassName="text-sm text-[#6b7280]"
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </PollenGeneralLayout>
  );
}
