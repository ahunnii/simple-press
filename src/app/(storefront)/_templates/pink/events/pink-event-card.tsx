"use client";

import type { RouterOutputs } from "~/trpc/react";
import { eventDateTimeAttr, formatEventDateParts } from "~/lib/events/format";

import { PinkEventFlier } from "./pink-event-flier";

export type PinkEvent = RouterOutputs["events"]["getUpcomingPublic"][number];

type Props = {
  event: PinkEvent;
  /** `Business.timeZone` — every date on the page is formatted through it. */
  timeZone: string;
  /**
   * Already resolved to a non-blank string by the page (per-event label →
   * template fallback field → hardcoded default). Passed in rather than
   * resolved here so an owner who clears a label field can never produce a
   * link with no accessible name.
   */
  linkLabel: string;
  /** Set on the first row of cards — the fliers are above the fold. */
  priority?: boolean;
};

/**
 * One dated `Event` on `/events`.
 *
 * `"use client"` only because the flier opens a lightbox; everything else is
 * static markup, and the page that renders these stays a server component.
 *
 * Anatomy (design.md → Shared component inventory): 3:4 flier, then a meta
 * block hung under the same `1px solid var(--pink-ink)` rule the product card
 * uses — date, name, blurb, a label line for where/how much, and the event's
 * own outbound link.
 */
export function PinkEventCard({
  event,
  timeZone,
  linkLabel,
  priority = false,
}: Props) {
  // The one date formatter. Never `toLocale*` — the shop's zone has to be
  // passed explicitly or the RSC render and the hydrated render disagree for
  // any viewer outside it.
  const when = formatEventDateParts(event, timeZone, { showZone: true });

  const meta = [event.location, event.priceLabel]
    .filter((value) => value?.trim())
    .join(" · ");

  return (
    <article className="flex h-full flex-col">
      <PinkEventFlier
        src={event.coverImage}
        name={event.name}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        className="pink-lift"
      />

      <div
        className="mt-4 flex flex-1 flex-col gap-2.5 pt-4"
        style={{ borderTop: "1px solid var(--pink-ink)" }}
      >
        <time
          dateTime={eventDateTimeAttr(event, timeZone)}
          className="flex flex-col gap-1"
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

        <h2
          className="pink-display text-[1.25rem] leading-[1.2] font-semibold tracking-[-0.015em]"
          style={{ color: "var(--pink-ink)" }}
        >
          {event.name}
        </h2>

        {event.blurb && (
          <p
            className="text-[0.9375rem] leading-[1.7]"
            style={{ color: "var(--pink-body)" }}
          >
            {event.blurb}
          </p>
        )}

        {meta && <p className="pink-label">{meta}</p>}

        {event.externalUrl && (
          <a
            href={event.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Every card's link reads the same out of context, so the name is
            // qualified with the event. The visible text stays the first words
            // of the accessible name (WCAG 2.5.3, Label in Name).
            aria-label={`${linkLabel} — ${event.name}`}
            className="pink-btn pink-btn-ghost pink-btn-sm mt-auto self-start"
          >
            {linkLabel}
          </a>
        )}
      </div>
    </article>
  );
}
