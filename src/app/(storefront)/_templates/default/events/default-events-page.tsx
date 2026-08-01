import Image from "next/image";
import Link from "next/link";

import type { DefaultEventsPageTemplateProps } from "../../types";
import { eventDateTimeAttr, formatEventDate } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";
import { EventFlierLightbox } from "~/app/(storefront)/_components/events/event-flier-lightbox";

import { resolveFields } from "..";

export async function DefaultEventsPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
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
  ]);

  const linkFallbackLabel = f["default.events.list-link-fallback-label"] ?? "";

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("events", "hero")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {f["default.events.hero-eyebrow"] && (
            <span
              className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
              {...fieldAttr("default.events.hero-eyebrow")}
            >
              {f["default.events.hero-eyebrow"]}
            </span>
          )}
          <h1
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance"
            {...fieldAttr("default.events.hero-heading")}
          >
            {f["default.events.hero-heading"] ?? "Events"}
          </h1>
          {f["default.events.hero-tagline"] && (
            <p
              className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]"
              {...fieldAttr("default.events.hero-tagline")}
            >
              {f["default.events.hero-tagline"]}
            </p>
          )}
        </div>
      </section>

      {/* ── Event list ───────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("events", "list")}
        className="px-6 py-16 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {events.length === 0 ? (
            <div className="rounded-(--radius) border border-[#e8e8e8] py-24 text-center">
              <p
                className="text-[15px] font-medium text-[#0a0a0a]"
                {...fieldAttr("default.events.list-empty-heading")}
              >
                {f["default.events.list-empty-heading"] ?? "No upcoming events"}
              </p>
              {f["default.events.list-empty-body"] && (
                <p
                  className="mt-1 text-sm text-[#6b6b6b]"
                  {...fieldAttr("default.events.list-empty-body")}
                >
                  {f["default.events.list-empty-body"]}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-14">
              {events.map((event) => {
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

                return (
                  <article
                    key={event.id}
                    className="grid grid-cols-1 gap-8 border-b border-[#e8e8e8] pb-14 last:border-b-0 last:pb-0 sm:grid-cols-[280px_1fr]"
                  >
                    {/* Flier */}
                    <div className="relative aspect-3/4 overflow-hidden rounded-(--radius) bg-[#efece8]">
                      {event.coverImage ? (
                        <EventFlierLightbox
                          src={event.coverImage}
                          alt={event.name}
                        >
                          <div className="relative h-full w-full">
                            <Image
                              src={event.coverImage}
                              alt={event.name}
                              fill
                              className="object-cover transition-transform duration-500 hover:scale-105"
                              sizes="(max-width: 640px) 100vw, 280px"
                            />
                          </div>
                        </EventFlierLightbox>
                      ) : null}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-3">
                      <time
                        dateTime={eventDateTimeAttr(event, timeZone)}
                        className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                      >
                        {formatEventDate(event, timeZone, { showZone: true })}
                      </time>
                      <h2 className="font-serif text-[26px] font-medium tracking-[-0.015em]">
                        {event.name}
                      </h2>
                      {event.location && (
                        <p className="text-[14px] text-[#6b6b6b]">
                          {event.location}
                        </p>
                      )}
                      {event.blurb && (
                        <p className="max-w-[560px] text-[15px] leading-relaxed text-[#6b6b6b]">
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
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "default", "events.cta") && (
        <section
          {...sectionGroupAttr("events", "cta")}
          className="bg-[#efece8] px-6 py-24 text-center lg:px-8"
        >
          <div className="mx-auto max-w-[640px]">
            <h2
              className="font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]"
              {...fieldAttr("default.events.cta-heading")}
            >
              {f["default.events.cta-heading"] ?? "Want us at your event?"}
            </h2>
            {f["default.events.cta-body"] && (
              <p
                className="mt-4 text-[15px] text-[#6b6b6b]"
                {...fieldAttr("default.events.cta-body")}
              >
                {f["default.events.cta-body"]}
              </p>
            )}
            <div className="mt-8">
              <Link
                href={f["default.events.cta-button-link"] ?? "/contact"}
                className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
                {...fieldAttr("default.events.cta-button-text")}
              >
                {f["default.events.cta-button-text"] ?? "Get in touch"}
              </Link>
            </div>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
