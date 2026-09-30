import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Leaf, MapPin } from "lucide-react";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  PageTransition,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";
import { EventFlierVideo } from "~/app/(storefront)/_components/events/event-flier-video";
import { EventLinkQr } from "~/app/(storefront)/_components/events/event-link-qr";

import { resolveFields } from "..";
// Default's resolver, not bamboo's: this page keeps reading the existing
// `default.events.*` keys (owner-saved copy carries over untouched), and only
// Default's field map knows their `defaultValue`s — bamboo's `resolveFields`
// would return "" for every one of them.
import { resolveFields as resolveDefaultFields } from "../../default";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooWaveLeaves,
  BambooWaveSprig,
  BAND_WAVE_SPRIG_ROOT,
  BAND_WAVE_SPRIG_SIZE,
} from "../shared/bamboo-wave-leaves";
import {
  BAMBOO_EVENT_CARD,
  BAMBOO_EVENT_CHIP,
  BAMBOO_EVENT_EYEBROW,
  BAMBOO_EVENT_PILL,
  BambooEventsEmptyState,
} from "./bamboo-event-parts";
import { BambooEventsCtaButton } from "./bamboo-events-cta-button";

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
 * `/events` — bamboo's events index, built on the generic page's base: the
 * shared `BambooPageHero` title band (which carries `BAMBOO_TOP_MARKER`, so
 * the emblem clears it) and the same `max-w-7xl px-4 lg:px-8` container, so
 * hero text, event cards and the closing band all share one left edge
 * (x=112 at 1440, 16 at 390 — B1.2/B1.7).
 *
 * Data logic is Default's events page's, carried over verbatim: media
 * precedence (video → image → none), `formatEventDate`/`eventDateTimeAttr`,
 * the price label, the external link's "first non-blank wins" label,
 * `EventLinkQr`, the empty state, and the hideable `events.cta` band. Copy is
 * Default's `default.events.*` fields read through Default's resolver.
 *
 * The closing band is bamboo's About-CTA treatment (gold hairline wave over a
 * forest gradient, cream pill); the list section above it is always cream, so
 * the wave needs no backing strip. Its button (`BambooEventsCtaButton`) hides
 * when its href points at a flag-disabled feature (baseline B2.5).
 */
export function BambooEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, FIELD_KEYS);
  // Generic-base parity: the site-wide page-hero photo applies here exactly
  // as it does on generic CMS pages (no per-page override field).
  const heroBgImage = resolveFields(customFields, [
    "bamboo.global.page-hero-bg-image",
  ])["bamboo.global.page-hero-bg-image"];

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";
  const ctaVisible = isSectionVisible(customFields, "bamboo", "events.cta");
  const ctaHref = (f["default.events.cta-button-link"] ?? "") || "/contact";

  return (
    <PageTransition>
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("events", "hero")}
        eyebrow={f["default.events.hero-eyebrow"]}
        eyebrowFieldKey="default.events.hero-eyebrow"
        eyebrowIcon={Leaf}
        title={(f["default.events.hero-heading"] ?? "") || "Events"}
        titleFieldKey="default.events.hero-heading"
        lede={f["default.events.hero-tagline"]}
        ledeFieldKey="default.events.hero-tagline"
        bgImage={heroBgImage}
      />

      {/* ── Event list (cream — declares no background) ─────────────────── */}
      <section {...sectionGroupAttr("events", "list")} className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {events.length === 0 ? (
            <BambooEventsEmptyState
              heading={
                (f["default.events.list-empty-heading"] ?? "") ||
                "No upcoming events"
              }
              body={f["default.events.list-empty-body"]}
            />
          ) : (
            <StaggerContainer className="flex flex-col gap-8">
              {events.map((event) => {
                // First non-blank wins. A chain of `??` would be wrong here:
                // an owner who clears the per-event label or the template's
                // fallback field leaves an empty string behind, not null, and
                // `??` passes that straight through — rendering a link with
                // no text and no accessible name.
                const linkLabel =
                  [
                    event.externalUrlLabel,
                    linkFallbackLabel,
                    "More details",
                  ].find((candidate) => candidate?.trim()) ?? "More details";
                const hasMedia = !!event.coverVideo || !!event.coverImage;

                return (
                  <StaggerItem key={event.id}>
                    <article
                      className={cn(
                        BAMBOO_EVENT_CARD,
                        hasMedia &&
                          "grid grid-cols-1 sm:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]",
                      )}
                    >
                      {/* Flier — one media slot per event, video first.
                          Both letterbox (object-contain) inside a 3:4
                          cream-deep frame, so no poster is ever cropped; the
                          lightbox opens it full size. */}
                      {hasMedia && (
                        <div className="relative aspect-3/4 overflow-hidden bg-[var(--bam-cream-deep)]">
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
                                  className="object-contain transition-transform duration-500 motion-safe:hover:scale-[1.03]"
                                  sizes="(max-width: 640px) 100vw, 280px"
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
                          className={BAMBOO_EVENT_EYEBROW}
                        >
                          <CalendarDays
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {formatEventDate(event, timeZone, { showZone: true })}
                        </time>
                        <h2 className="text-foreground text-2xl leading-snug font-bold text-balance md:text-3xl">
                          <Link
                            href={`/events/${event.slug}`}
                            className="focus-visible:ring-ring rounded-sm transition-colors hover:text-[var(--bam-forest)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          >
                            {event.name}
                          </Link>
                        </h2>
                        {event.location && (
                          <p className="text-muted-foreground inline-flex items-start gap-2">
                            <MapPin
                              className="mt-0.5 size-4 shrink-0 text-[var(--bam-forest)]"
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
                              <span className={BAMBOO_EVENT_CHIP}>
                                {event.priceLabel}
                              </span>
                            )}
                            {event.externalUrl && (
                              <Button asChild className={BAMBOO_EVENT_PILL}>
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
                          tileClassName="rounded-xl border border-[var(--bam-hairline)]"
                          captionClassName="text-muted-foreground text-xs"
                        />
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* ── Closing band — bamboo's About-CTA treatment ─────────────────── */}
      {ctaVisible && (
        <section
          {...sectionGroupAttr("events", "cta")}
          className="relative overflow-x-clip"
        >
          {/* Top wave only — the footer brings its own lip below. The list
              section above is always cream (no background), so the wave's
              transparent-above area needs no backing strip. */}
          <BambooWaveDivider
            variant="hairline"
            className="-mb-px h-14 md:h-24"
          />
          <div className="bg-gradient-to-b from-[var(--bam-forest)] to-[var(--bam-forest-deep)] py-20 md:py-28">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <ScaleIn>
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
                  <h2 className="font-serif text-4xl font-bold tracking-tight text-[var(--bam-cream)] md:text-5xl">
                    <span
                      className="text-balance"
                      {...fieldAttr("default.events.cta-heading")}
                    >
                      {(f["default.events.cta-heading"] ?? "") ||
                        "Want us at your event?"}
                    </span>
                  </h2>
                  {f["default.events.cta-body"] ? (
                    <p
                      className="leading-relaxed text-[var(--bam-cream)]/80"
                      {...fieldAttr("default.events.cta-body")}
                    >
                      {f["default.events.cta-body"]}
                    </p>
                  ) : null}
                  <BambooEventsCtaButton
                    href={ctaHref}
                    text={
                      (f["default.events.cta-button-text"] ?? "") ||
                      "Get in touch"
                    }
                  />
                </div>
              </ScaleIn>
            </div>
          </div>

          {/* Wave sprigs rising from the top wave into the list section's
              bottom padding (py-20), deeper than their ~32px rise. */}
          <BambooWaveLeaves className="z-[2]">
            <BambooWaveSprig
              side="left"
              className={`${BAND_WAVE_SPRIG_ROOT.left} ${BAND_WAVE_SPRIG_SIZE}`}
            />
            <BambooWaveSprig
              side="right"
              className={`${BAND_WAVE_SPRIG_ROOT.right} ${BAND_WAVE_SPRIG_SIZE}`}
            />
          </BambooWaveLeaves>
        </section>
      )}
    </PageTransition>
  );
}
