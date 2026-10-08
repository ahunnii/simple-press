import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see glove-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import { GloveButton, GloveSection } from "../shared";

/**
 * `/events/<slug>` — single-event detail on glove's generic base. The band
 * carries the event name as the page's only h1; the body carries Default's
 * detail logic: back link, past-event badge, media precedence (video, then
 * image, then none), date, location, blurb, price, external link and
 * `EventLinkQr`. The flier shows uncropped beside the details at lg, stacked
 * above them on phones. Tagged with the `events.list` group (it owns the
 * fallback link label this page uses).
 */
export function GloveEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);
  const eventsLabel =
    (f["default.events.hero-heading"] ?? "").trim() || "Events";

  // First non-blank wins (see glove-events-page.tsx) so the link reads the
  // same here as on the index.
  const linkLabel =
    [
      event.externalUrlLabel,
      f["default.events.list-link-fallback-label"],
      "More details",
    ].find((candidate) => candidate?.trim()) ?? "More details";
  const hasMedia = !!event.coverVideo || !!event.coverImage;

  return (
    <GloveGeneralLayout
      title={event.name}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: eventsLabel, href: "/events" },
        { label: event.name },
      ]}
    >
      <GloveSection
        tone="paper"
        aria-label={event.name}
        sectionAttrs={sectionGroupAttr("events", "list")}
        reveal={false}
      >
        <Link
          href="/events"
          className="glove-display inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.5px] text-[var(--glove-primary)] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All events
        </Link>

        <div
          className={
            hasMedia
              ? "mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
              : "mt-8"
          }
        >
          {hasMedia ? (
            <div className="w-full max-w-md lg:max-w-none">
              {event.coverVideo ? (
                <div className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-[var(--glove-mist)]">
                  <EventFlierVideo src={event.coverVideo} name={event.name} />
                </div>
              ) : event.coverImage ? (
                <div className="overflow-hidden rounded-[12px] bg-[var(--glove-mist)] [box-shadow:var(--glove-shadow-sm)]">
                  <EventFlierLightbox
                    src={event.coverImage}
                    alt={event.name}
                    panelClassName="rounded-[12px]"
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
          ) : null}

          <div className="flex max-w-3xl flex-col gap-4">
            {isPast ? (
              <p className="glove-display w-fit rounded-full bg-[var(--glove-mist)] px-4 py-1.5 text-[12px] font-semibold tracking-[1.5px] text-[var(--glove-primary)] uppercase">
                This event has passed
              </p>
            ) : null}
            <time
              dateTime={eventDateTimeAttr(event, timeZone)}
              className="glove-display inline-flex items-center gap-2 text-[14px] font-medium tracking-[2px] text-[var(--glove-primary)] uppercase"
            >
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              {formatEventDate(event, timeZone, { showZone: true })}
            </time>
            {event.location ? (
              <p className="glove-body inline-flex items-start gap-2 text-[16px] text-[var(--glove-muted)]">
                <MapPin
                  className="mt-1 size-4 shrink-0 text-[var(--glove-primary)]"
                  aria-hidden="true"
                />
                {event.location}
              </p>
            ) : null}
            {event.blurb ? (
              <p className="glove-body mt-2 text-[17px] leading-relaxed whitespace-pre-line text-[var(--glove-text)]">
                {event.blurb}
              </p>
            ) : null}
            {!!event.priceLabel || !!event.externalUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {event.priceLabel ? (
                  <span className="glove-display inline-flex items-center rounded-full bg-[var(--glove-mist)] px-4 py-1.5 text-[13px] font-semibold text-[var(--glove-primary)]">
                    {event.priceLabel}
                  </span>
                ) : null}
                {event.externalUrl ? (
                  <GloveButton
                    href={event.externalUrl}
                    external
                    variant="woo"
                    size="lg"
                  >
                    {linkLabel}
                  </GloveButton>
                ) : null}
              </div>
            ) : null}
            <EventLinkQr
              event={event}
              logoUrl={business.siteContent?.logoUrl}
              size="lg"
              className="mt-4"
              tileClassName="rounded-[8px] border border-[var(--glove-line)]"
              captionClassName="text-sm text-[var(--glove-muted)]"
            />
          </div>
        </div>
      </GloveSection>
    </GloveGeneralLayout>
  );
}
