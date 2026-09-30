import Image from "next/image";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver — see vii-events-page.tsx for why.
import { resolveFields as resolveDefaultFields } from "../../default";
import { ViiPageBand } from "../generic/vii-page-band";
import { ViiPageSection } from "../generic/vii-page-section";
import { VII_BUTTON_STYLE } from "../shared/vii-button-style";
import { ViiCtaLink } from "../shared/vii-cta-link";
import { nonBlank } from "../shared/vii-non-blank";
import { VII_TEXT_MEASURE } from "../shared/vii-page-edge";
import { ViiReveal } from "../shared/vii-reveal";
import { VII_EVENT_PRICE_STYLE } from "./vii-event-styles";

/**
 * `/events/<slug>` — single-event detail on vii's generic base. The band is
 * the generic page's cream `ViiPageBand` (clears the fixed header), with the
 * event name as the page's only h1, a back link above it, the Events page
 * heading as its overline (the way the blog post band reads "Blog"), and the
 * date / location / past-event badge underneath.
 *
 * The body carries Default's event detail page's data logic: media
 * precedence (video → image → none), blurb, price, external link and
 * `EventLinkQr`. It's skipped when the event has none of those, so a
 * date-only event doesn't end on an empty padded strip.
 *
 * Unlike Default's detail page (no editor wiring), the band is tagged
 * `events.hero` (it shows that group's heading) and the body `events.list`
 * (the group owning the fallback link label this page also uses).
 */
export function ViiEventPage({
  business,
  event,
  timeZone,
  isPast,
}: DefaultEventPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.events.hero-heading",
    "default.events.list-link-fallback-label",
  ]);

  // First non-blank wins — see vii-events-page.tsx for why a chain of `??`
  // would be wrong here. Same chain as the index page, so an event's link
  // reads the same on both.
  const linkLabel =
    [
      event.externalUrlLabel,
      f["default.events.list-link-fallback-label"],
      "More details",
    ].find((candidate) => candidate?.trim()) ?? "More details";
  const hasMedia = !!event.coverVideo || !!event.coverImage;
  const hasBody =
    hasMedia || !!event.blurb || !!event.priceLabel || !!event.externalUrl;

  return (
    <PageTransition>
      <ViiPageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        leading={
          <ViiCtaLink href="/events" showArrow={false}>
            <ArrowLeft aria-hidden="true" style={{ width: 14, height: 14 }} />
            All events
          </ViiCtaLink>
        }
        overline={nonBlank(f["default.events.hero-heading"])}
        overlineFieldKey="default.events.hero-heading"
        title={event.name}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px 28px",
            marginTop: 24,
            fontFamily: "var(--font-sans)",
          }}
        >
          {isPast && (
            <p
              style={{
                margin: 0,
                padding: "6px 12px",
                background: "var(--vii-paper)",
                border: "1px solid var(--vii-hairline-strong)",
                borderRadius: "var(--radius)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--vii-navy)",
              }}
            >
              This event has passed
            </p>
          )}
          <time
            dateTime={eventDateTimeAttr(event, timeZone)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--vii-navy)",
            }}
          >
            {formatEventDate(event, timeZone, { showZone: true })}
          </time>
          {event.location && (
            <p
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                margin: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: "var(--vii-ink-soft)",
              }}
            >
              <MapPin
                aria-hidden="true"
                style={{
                  width: 15,
                  height: 15,
                  marginTop: 3,
                  flexShrink: 0,
                  color: "var(--vii-copper)",
                }}
              />
              {event.location}
            </p>
          )}
        </div>
      </ViiPageBand>

      {hasBody && (
        <ViiPageSection sectionAttrs={sectionGroupAttr("events", "list")}>
          <ViiReveal>
            <div
              className={
                hasMedia
                  ? "grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
                  : undefined
              }
            >
              {/* Flier — same media precedence as the events index. The
                  image keeps its own aspect (no crop); a video needs a sized
                  box for its absolutely-positioned player, so it letterboxes
                  inside a 3:4 paper frame. */}
              {hasMedia && (
                <div className="w-full max-w-md lg:max-w-none">
                  {event.coverVideo ? (
                    <div
                      className="relative aspect-3/4 overflow-hidden"
                      style={{
                        background: "var(--vii-paper)",
                        borderRadius: "var(--radius)",
                      }}
                    >
                      <EventFlierVideo
                        src={event.coverVideo}
                        name={event.name}
                      />
                    </div>
                  ) : event.coverImage ? (
                    <div
                      className="overflow-hidden"
                      style={{
                        background: "var(--vii-paper)",
                        borderRadius: "var(--radius)",
                      }}
                    >
                      <EventFlierLightbox
                        src={event.coverImage}
                        alt={event.name}
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  minWidth: 0,
                  maxWidth: VII_TEXT_MEASURE,
                }}
              >
                {event.blurb && (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 17,
                      lineHeight: 1.75,
                      color: "var(--vii-ink-soft)",
                      margin: 0,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {event.blurb}
                  </p>
                )}
                {(!!event.priceLabel || !!event.externalUrl) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "16px 28px",
                      marginTop: 4,
                    }}
                  >
                    {event.priceLabel && (
                      <span style={VII_EVENT_PRICE_STYLE}>
                        {event.priceLabel}
                      </span>
                    )}
                    {event.externalUrl && (
                      <a
                        href={event.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vii-cta-btn"
                        style={VII_BUTTON_STYLE}
                      >
                        {linkLabel}
                        <ArrowUpRight
                          aria-hidden="true"
                          style={{ width: 14, height: 14 }}
                        />
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    )}
                  </div>
                )}
                <EventLinkQr
                  event={event}
                  logoUrl={business.siteContent?.logoUrl}
                  size="lg"
                  className="mt-2"
                  tileClassName="rounded-(--radius) border border-[var(--vii-hairline)]"
                  captionClassName="text-sm text-[var(--vii-ink-soft)]"
                />
              </div>
            </div>
          </ViiReveal>
        </ViiPageSection>
      )}
    </PageTransition>
  );
}
