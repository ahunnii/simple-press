import Link from "next/link";

import type { PinkEvent } from "../events/pink-event-card";
import { eventDateTimeAttr, formatEventDateParts } from "~/lib/events/format";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkEventFlier } from "../events/pink-event-flier";
import { PinkReveal } from "../shared/pink-reveal";

type Props = {
  eyebrow: string;
  heading: string;
  note: string;
  ctaLabel: string;
  ctaLink: string;
  emptyHeading: string;
  emptyBody: string;
  /** Already limited and ordered by `events.getUpcomingPublic`. */
  events: PinkEvent[];
  /** `Business.timeZone` — every date here is formatted through it. */
  timeZone: string;
};

/**
 * `homepage.upcoming` — the next few REAL, dated `Event` records, pulled from
 * the DB via `events.getUpcomingPublic`.
 *
 * Sits directly BELOW `homepage.events` (the ink "Make & Takes" band), so it
 * is deliberately NOT ink: black is reserved for exactly two surfaces in this
 * template — that band and the footer — and stacking two dark slabs would
 * flatten the page's light → dark rhythm. It runs on the pale `--pink-panel`
 * wash instead, which steps the page back out of black after the ink band —
 * white → blush → black → blush again → on toward the videos band below.
 *
 * The two bands answer different questions and must not be merged: this one is
 * "when can I come", `homepage.events` is "what even is a make & take".
 *
 * Cards mirror the `/events` index card (`PinkEventCard`): a full-width flier
 * first, then a meta block hung under the same `1px solid var(--pink-ink)`
 * rule, rather than the old 88–104px thumbnail-and-text row. A flier that's
 * too small to read defeats the point of having one, and repeating the same
 * card idiom here keeps the homepage teaser and the full listing legible as
 * one visual language.
 *
 * Hideable, and collapses to nothing when there is neither an event nor
 * empty-state copy — a fresh store must not leave a void directly under the
 * dark band.
 */
export function PinkUpcomingSection({
  eyebrow,
  heading,
  note,
  ctaLabel,
  ctaLink,
  emptyHeading,
  emptyBody,
  events,
  timeZone,
}: Props) {
  const hasEvents = events.length > 0;
  const hasEmptyCopy = Boolean(emptyHeading || emptyBody);

  if (!hasEvents && !hasEmptyCopy) return null;

  // One card reads as a lone strip across 1400px; two look stranded in a
  // three-track grid. The row adapts to what is actually scheduled.
  const columnsClassName =
    events.length === 1
      ? "grid-cols-1 md:max-w-[640px]"
      : events.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      {...(heading
        ? { "aria-labelledby": "pink-upcoming-heading" }
        : { "aria-label": "Upcoming events" })}
      className="px-5 py-16 md:px-10 md:py-24"
      style={{ background: "var(--pink-panel)" }}
      {...sectionGroupAttr("homepage", "upcoming")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            {eyebrow && (
              <span
                className="pink-eyebrow"
                {...fieldAttr("pink.homepage.upcoming-eyebrow")}
              >
                {eyebrow}
              </span>
            )}
            {heading && (
              <h2
                id="pink-upcoming-heading"
                className="pink-display text-[clamp(1.625rem,2.8vw,2.375rem)] font-semibold tracking-[-0.025em]"
                style={{ color: "var(--pink-ink)" }}
                {...fieldAttr("pink.homepage.upcoming-heading")}
              >
                {heading}
              </h2>
            )}
            {/* The default lead-in tells people to tap a flier, which is only
                true once there is one on screen. */}
            {hasEvents && note && (
              <p
                className="max-w-[52ch] text-[1.0625rem] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.homepage.upcoming-note")}
              >
                {note}
              </p>
            )}
          </div>

          {hasEvents && ctaLabel && (
            <Link
              href={ctaLink}
              className="pink-btn pink-btn-ghost shrink-0"
              {...fieldAttr("pink.homepage.upcoming-cta-label")}
            >
              {ctaLabel}
            </Link>
          )}
        </div>

        {hasEvents ? (
          <div className={`mt-10 grid gap-5 ${columnsClassName}`}>
            {events.map((event, i) => {
              const when = formatEventDateParts(event, timeZone);
              return (
                <PinkReveal key={event.id} index={i}>
                  <article
                    className="flex h-full flex-col p-4 sm:p-5"
                    style={{
                      background: "var(--pink-white)",
                      border: "1px solid var(--pink-line)",
                    }}
                  >
                    <PinkEventFlier
                      src={event.coverImage}
                      name={event.name}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="pink-lift"
                    />

                    <div
                      className="mt-4 flex flex-1 flex-col gap-1.5 pt-4"
                      style={{ borderTop: "1px solid var(--pink-ink)" }}
                    >
                      <time
                        dateTime={eventDateTimeAttr(event, timeZone)}
                        className="flex flex-col gap-0.5"
                      >
                        <span className="pink-eyebrow">{when.date}</span>
                        {when.time && (
                          <span
                            className="text-[0.8125rem] leading-[1.5]"
                            style={{ color: "var(--pink-muted)" }}
                          >
                            {when.time}
                          </span>
                        )}
                      </time>

                      <h3
                        className="pink-display text-[1.0625rem] leading-[1.25] font-semibold tracking-[-0.015em]"
                        style={{ color: "var(--pink-ink)" }}
                      >
                        {event.name}
                      </h3>

                      {event.location && (
                        <p className="pink-label truncate">{event.location}</p>
                      )}

                      {event.blurb && (
                        <p
                          className="line-clamp-3 text-[0.875rem] leading-[1.6]"
                          style={{ color: "var(--pink-body)" }}
                        >
                          {event.blurb}
                        </p>
                      )}
                    </div>
                  </article>
                </PinkReveal>
              );
            })}
          </div>
        ) : (
          // Designed empty state rather than a bare gap. `<p>` not a heading:
          // the band already owns the only heading it needs, and an h3 with no
          // section under it reads as a broken outline.
          <div
            className="mt-10 flex flex-col gap-2 px-6 py-10 text-center"
            style={{
              background: "var(--pink-white)",
              border: "1px solid var(--pink-line)",
            }}
          >
            {emptyHeading && (
              <p
                className="pink-display text-[1.125rem] font-semibold"
                style={{ color: "var(--pink-ink)" }}
                {...fieldAttr("pink.homepage.upcoming-empty-heading")}
              >
                {emptyHeading}
              </p>
            )}
            {emptyBody && (
              <p
                className="mx-auto max-w-[46ch] text-[0.9375rem] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.homepage.upcoming-empty-body")}
              >
                {emptyBody}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
