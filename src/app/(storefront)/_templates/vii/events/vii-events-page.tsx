import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not vii's: this page keeps reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — vii's `resolveFields`
// would return "" for every one of them.
import { resolveFields as resolveDefaultFields } from "../../default";
import { ViiClosingBand } from "../generic/vii-closing-band";
import { ViiPageBand } from "../generic/vii-page-band";
import { ViiPageEmptyState } from "../generic/vii-page-empty-state";
import { ViiPageSection } from "../generic/vii-page-section";
import { nonBlank } from "../shared/vii-non-blank";
import { ViiOverline } from "../shared/vii-overline";
import { VII_TEXT_MEASURE } from "../shared/vii-page-edge";
import { ViiRevealGroup } from "../shared/vii-reveal";
import {
  VII_EVENT_LINK_STYLE,
  VII_EVENT_PRICE_STYLE,
} from "./vii-event-styles";
import { ViiEventsCtaButton } from "./vii-events-cta-button";

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

/**
 * `/events` — vii's events index, built on the generic page's base: the
 * cream `ViiPageBand` (clears the fixed header; overline + h1 on the page
 * edge) and `ViiPageSection` bodies on the same left edge (86px at 1440,
 * 24px at 390 — B1.2/B1.7).
 *
 * Data logic is Default's events page's, carried over verbatim: media
 * precedence (video → image → none), `formatEventDate`/`eventDateTimeAttr`,
 * the price label, the external link's "first non-blank wins" label,
 * `EventLinkQr`, the empty state, and the hideable `events.cta` band. Copy
 * is Default's `default.events.*` fields read through Default's resolver.
 */
export function ViiEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";
  const ctaVisible = isSectionVisible(customFields, "vii", "events.cta");
  const ctaHref = nonBlank(f["default.events.cta-button-link"]) ?? "/contact";

  return (
    <PageTransition>
      <ViiPageBand
        sectionAttrs={sectionGroupAttr("events", "hero")}
        overline={f["default.events.hero-eyebrow"]}
        overlineFieldKey="default.events.hero-eyebrow"
        title={nonBlank(f["default.events.hero-heading"]) ?? "Events"}
        titleFieldKey="default.events.hero-heading"
        intro={f["default.events.hero-tagline"]}
        introFieldKey="default.events.hero-tagline"
      />

      {/* ── Event list ─────────────────────────────────────────────────── */}
      <ViiPageSection sectionAttrs={sectionGroupAttr("events", "list")}>
        {events.length === 0 ? (
          <ViiPageEmptyState
            heading={
              nonBlank(f["default.events.list-empty-heading"]) ??
              "No upcoming events"
            }
            headingFieldKey="default.events.list-empty-heading"
            body={f["default.events.list-empty-body"]}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          <ViiRevealGroup
            threshold={0.04}
            style={{ borderTop: "1px solid var(--vii-hairline)" }}
          >
            {events.map((event, i) => {
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
                <article
                  key={event.id}
                  className={
                    hasMedia
                      ? "vii-reveal-item grid grid-cols-1 gap-8 sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14"
                      : "vii-reveal-item"
                  }
                  style={
                    {
                      "--i": Math.min(i, 7),
                      padding: "clamp(32px, 4vw, 48px) 0",
                      borderBottom: "1px solid var(--vii-hairline)",
                    } as CSSProperties
                  }
                >
                  {/* Flier — one media slot per event, video first. Both
                      media types letterbox (object-contain) inside the 3:4
                      paper frame, so no poster is ever cropped; the lightbox
                      opens it full size. */}
                  {hasMedia && (
                    <div
                      className="relative aspect-3/4 w-full max-w-[320px] overflow-hidden sm:max-w-none"
                      style={{
                        background: "var(--vii-paper)",
                        borderRadius: "var(--radius)",
                      }}
                    >
                      {event.coverVideo ? (
                        <EventFlierVideo
                          src={event.coverVideo}
                          name={event.name}
                        />
                      ) : event.coverImage ? (
                        <EventFlierLightbox
                          src={event.coverImage}
                          alt={event.name}
                        >
                          <div className="relative aspect-3/4 w-full">
                            <Image
                              src={event.coverImage}
                              alt={event.name}
                              fill
                              className="object-contain transition-transform duration-700 motion-safe:hover:scale-[1.03]"
                              sizes="(max-width: 640px) 320px, 280px"
                            />
                          </div>
                        </EventFlierLightbox>
                      ) : null}
                    </div>
                  )}

                  {/* Details */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minWidth: 0,
                      maxWidth: VII_TEXT_MEASURE,
                    }}
                  >
                    <ViiOverline>
                      <time dateTime={eventDateTimeAttr(event, timeZone)}>
                        {formatEventDate(event, timeZone, { showZone: true })}
                      </time>
                    </ViiOverline>
                    <h2
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 400,
                        fontSize: "clamp(26px, 3vw, 36px)",
                        lineHeight: 1.15,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      <Link
                        href={`/events/${event.slug}`}
                        className="decoration-[var(--vii-copper)] decoration-1 underline-offset-[6px] hover:underline"
                        style={{ color: "inherit" }}
                      >
                        {event.name}
                      </Link>
                    </h2>
                    {event.location && (
                      <p
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: "var(--vii-ink-soft)",
                          margin: 0,
                        }}
                      >
                        <MapPin
                          aria-hidden="true"
                          style={{
                            width: 14,
                            height: 14,
                            marginTop: 3,
                            flexShrink: 0,
                            color: "var(--vii-copper)",
                          }}
                        />
                        {event.location}
                      </p>
                    )}
                    {event.blurb && (
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          lineHeight: 1.7,
                          color: "var(--vii-ink-soft)",
                          margin: "4px 0 0",
                          maxWidth: "62ch",
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
                          gap: "12px 28px",
                          marginTop: 8,
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
                            style={VII_EVENT_LINK_STYLE}
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
                      size="sm"
                      className="mt-3"
                      tileClassName="rounded-(--radius) border border-[var(--vii-hairline)]"
                      captionClassName="text-xs text-[var(--vii-ink-soft)]"
                    />
                  </div>
                </article>
              );
            })}
          </ViiRevealGroup>
        )}
      </ViiPageSection>

      {/* ── Closing band — the page's ending ───────────────────────────── */}
      {ctaVisible && (
        <ViiClosingBand
          sectionAttrs={sectionGroupAttr("events", "cta")}
          heading={
            nonBlank(f["default.events.cta-heading"]) ??
            "Want us at your event?"
          }
          headingFieldKey="default.events.cta-heading"
          body={f["default.events.cta-body"]}
          bodyFieldKey="default.events.cta-body"
        >
          <ViiEventsCtaButton
            href={ctaHref}
            text={f["default.events.cta-button-text"] ?? ""}
          />
        </ViiClosingBand>
      )}
    </PageTransition>
  );
}
