import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

// Default's resolver, not glove's: these pages keep reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and the
// `defaultValue`s are only known to Default's field map.
import { resolveFields as resolveDefaultFields } from "../../default";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { getGatedHref } from "../generic/glove-gated-href";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import {
  GloveButton,
  GloveHeading,
  GloveOverline,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";

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
 * `/events` — glove's events index on the generic base (banner band, 1222px
 * container, Poppins/Lato scale) carrying Default's events data logic: media
 * precedence (video, then image, then none), `formatEventDate` /
 * `eventDateTimeAttr`, price pill, "first non-blank" external-link label,
 * `EventLinkQr`, and the empty state. Ends on its own closing banner.
 */
export async function GloveEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";

  const heading = get("default.events.hero-heading").trim() || "Events";
  const eyebrow = get("default.events.hero-eyebrow");
  const linkFallbackLabel = get("default.events.list-link-fallback-label");
  const ctaHref = await getGatedHref(get("default.events.cta-button-link"));
  const ctaHeading = get("default.events.cta-heading");
  const ctaLabel = get("default.events.cta-button-text");
  const showCta =
    isSectionVisible(customFields, "glove", "events.cta") &&
    ctaHeading.trim().length > 0;

  return (
    <GloveGeneralLayout
      bandVariant="banner"
      title={heading}
      titleFieldKey="default.events.hero-heading"
      subtitle={get("default.events.hero-tagline")}
      subtitleFieldKey="default.events.hero-tagline"
      breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
      sectionAttrs={sectionGroupAttr("events", "hero")}
    >
      <GloveSection
        tone="paper"
        aria-label={heading}
        sectionAttrs={sectionGroupAttr("events", "list")}
        reveal={false}
      >
        {eyebrow ? (
          <GloveOverline
            fieldKey="default.events.hero-eyebrow"
            className="mb-8 md:mb-10"
          >
            {eyebrow}
          </GloveOverline>
        ) : null}

        {events.length === 0 ? (
          <GloveEmptyState
            heading={get("default.events.list-empty-heading")}
            headingFieldKey="default.events.list-empty-heading"
            body={get("default.events.list-empty-body")}
            bodyFieldKey="default.events.list-empty-body"
          />
        ) : (
          <GloveRevealGroup
            threshold={0}
            className="flex flex-col gap-8 md:gap-10"
          >
            {events.map((event, i) => {
              // First non-blank wins. `??` would pass a cleared label ("")
              // straight through and render a link with no accessible name.
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
                  className={`glove-reveal-item overflow-hidden rounded-[12px] border border-[var(--glove-line)] bg-[var(--glove-paper)] [box-shadow:var(--glove-shadow-sm)] ${
                    hasMedia
                      ? "grid grid-cols-1 sm:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]"
                      : ""
                  }`}
                  style={gloveRevealItemStyle(i)}
                >
                  {hasMedia ? (
                    <div className="relative aspect-[3/4] overflow-hidden bg-[var(--glove-mist)]">
                      {event.coverVideo ? (
                        <EventFlierVideo
                          src={event.coverVideo}
                          name={event.name}
                        />
                      ) : event.coverImage ? (
                        <EventFlierLightbox
                          src={event.coverImage}
                          alt={event.name}
                          panelClassName="rounded-[12px]"
                        >
                          <div className="relative aspect-[3/4] w-full">
                            <Image
                              src={event.coverImage}
                              alt={event.name}
                              fill
                              className="object-contain transition-transform duration-500 motion-safe:hover:scale-[1.03]"
                              sizes="(max-width: 640px) 100vw, 300px"
                            />
                          </div>
                        </EventFlierLightbox>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 p-6 md:p-8">
                    <time
                      dateTime={eventDateTimeAttr(event, timeZone)}
                      className="glove-display inline-flex items-center gap-2 text-[14px] font-medium text-[var(--glove-primary)]"
                    >
                      <CalendarDays
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      {formatEventDate(event, timeZone, { showZone: true })}
                    </time>
                    <h2 className="glove-display text-[24px] leading-[1.2] font-medium text-[var(--glove-ink)] md:text-[30px]">
                      <Link
                        href={`/events/${event.slug}`}
                        className="transition-colors hover:text-[var(--glove-primary)]"
                      >
                        {event.name}
                      </Link>
                    </h2>
                    {event.location ? (
                      <p className="glove-body inline-flex items-start gap-2 text-[15px] text-[var(--glove-muted)]">
                        <MapPin
                          className="mt-0.5 size-4 shrink-0 text-[var(--glove-primary)]"
                          aria-hidden="true"
                        />
                        {event.location}
                      </p>
                    ) : null}
                    {event.blurb ? (
                      <p className="glove-body max-w-3xl text-[16px] leading-relaxed text-[var(--glove-text)]">
                        {event.blurb}
                      </p>
                    ) : null}
                    {!!event.priceLabel || !!event.externalUrl ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
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
                          >
                            {linkLabel}
                          </GloveButton>
                        ) : null}
                      </div>
                    ) : null}
                    <EventLinkQr
                      event={event}
                      logoUrl={business.siteContent?.logoUrl}
                      size="sm"
                      className="mt-3"
                      tileClassName="rounded-[8px] border border-[var(--glove-line)]"
                      captionClassName="text-xs text-[var(--glove-muted)]"
                    />
                  </div>
                </article>
              );
            })}
          </GloveRevealGroup>
        )}
      </GloveSection>

      {showCta ? (
        <GloveSection
          tone="primary"
          aria-label={ctaHeading}
          sectionAttrs={sectionGroupAttr("events", "cta")}
          revealThreshold={0}
        >
          <div className="mx-auto max-w-2xl text-center">
            <GloveHeading
              as="h2"
              tone="light"
              fieldKey="default.events.cta-heading"
            >
              {ctaHeading}
            </GloveHeading>
            {get("default.events.cta-body") ? (
              <p
                className="glove-body mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--glove-on-plum-soft)] md:text-[18px]"
                {...fieldAttr("default.events.cta-body")}
              >
                {get("default.events.cta-body")}
              </p>
            ) : null}
            {ctaHref && ctaLabel.trim() ? (
              <div className="mt-8">
                <GloveButton href={ctaHref} variant="woo" size="lg" onDark>
                  <span {...fieldAttr("default.events.cta-button-text")}>
                    {ctaLabel}
                  </span>
                </GloveButton>
              </div>
            ) : null}
          </div>
        </GloveSection>
      ) : null}
    </GloveGeneralLayout>
  );
}
