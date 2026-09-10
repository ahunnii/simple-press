import Image from "next/image";
import Link from "next/link";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";

/**
 * Single-event detail page for the Default template. Deliberately no
 * visual-editor wiring (no sectionGroupAttr/fieldAttr/resolveFields) — unlike
 * the other Default pages, this one ships without editor sections.
 */
export function DefaultEventPage({
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  // First non-blank wins — see default-events-page.tsx for why a chain of
  // `??` would be wrong here: a cleared externalUrlLabel is "" not null, and
  // `??` would pass that straight through, rendering a link with no text and
  // no accessible name.
  const linkLabel =
    [event.externalUrlLabel, "More details"].find((candidate) =>
      candidate?.trim(),
    ) ?? "More details";

  return (
    <PageTransition>
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <Link
            href="/events"
            className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase underline underline-offset-4 hover:text-[#0a0a0a]"
          >
            ← All events
          </Link>

          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-[360px_1fr] sm:gap-14">
            {/* Flier — same media precedence as the events index: video
                first, then image, then nothing. */}
            <div className="relative aspect-3/4 overflow-hidden rounded-(--radius) bg-[#efece8]">
              {event.coverVideo ? (
                <EventFlierVideo src={event.coverVideo} name={event.name} />
              ) : event.coverImage ? (
                <EventFlierLightbox src={event.coverImage} alt={event.name}>
                  <div className="relative h-full w-full">
                    <Image
                      src={event.coverImage}
                      alt={event.name}
                      fill
                      className="object-contain transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 360px"
                    />
                  </div>
                </EventFlierLightbox>
              ) : null}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-4">
              {isPast && (
                <div className="w-fit rounded-(--radius) border border-[#e8e8e8] bg-[#efece8] px-3 py-1.5 text-xs font-medium tracking-[0.08em] text-[#6b6b6b] uppercase">
                  This event has passed
                </div>
              )}
              <time
                dateTime={eventDateTimeAttr(event, timeZone)}
                className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
              >
                {formatEventDate(event, timeZone, { showZone: true })}
              </time>
              <h1 className="font-serif text-[clamp(32px,4vw,52px)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance">
                {event.name}
              </h1>
              {event.location && (
                <p className="text-[15px] text-[#6b6b6b]">
                  {event.location}
                </p>
              )}
              {event.blurb && (
                <p className="max-w-[560px] text-[16px] leading-relaxed whitespace-pre-line text-[#6b6b6b]">
                  {event.blurb}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {event.priceLabel && (
                  <span className="text-sm font-medium text-[#0a0a0a]">
                    {event.priceLabel}
                  </span>
                )}
                {event.externalUrl && (
                  <a
                    href={event.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium tracking-[0.14em] text-[#0a0a0a] uppercase underline underline-offset-4"
                  >
                    {linkLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
