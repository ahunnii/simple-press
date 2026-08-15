import Image from "next/image";
import Link from "next/link";

import type { PinkFactRow } from "../shared/pink-fact-rows";
import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkImageFallback } from "../shared/pink-image-fallback";
import { PinkReveal } from "../shared/pink-reveal";
import { rowStr } from "./pink-homepage-list-utils";

type Props = {
  heading: string;
  note: string;
  body: string;
  mosaic: TemplateListRow[];
  facts: PinkFactRow[];
  ctaLabel: string;
  ctaLink: string;
  ctaNote: string;
};

/**
 * `homepage.events` — the make & takes band: an EVERGREEN explainer, not a
 * schedule. Ink section (one of only two dark surfaces in the template, with
 * the footer) doing four jobs, in order:
 *
 *   1. the owner's own photos and event fliers (`events-mosaic`),
 *   2. what a make & take actually is (`events-note` + `events-body`),
 *   3. how they're typically hosted (`events-facts`, dark fact rows),
 *   4. one "ask about hosting one" CTA (`events-cta-*`).
 *
 * There is deliberately NO schedule and NO price here: the owner does not sell
 * seats, so a dated/priced card row would advertise a model she does not run.
 * Everything is driven by template `list`/text fields.
 *
 * This band now sits ABOVE `homepage.upcoming` (`pink-upcoming-section.tsx`),
 * the paper band directly BELOW this one: the explainer makes the case for
 * what a make & take is and how to book the owner, then the dated calendar
 * follows as proof it actually happens. That band is the opposite of this one
 * in every other respect: real dated `Event` rows from the DB
 * (`events.getUpcomingPublic`), on paper rather than ink, gated on the
 * `events` feature flag, and linking through to `/events`. Two sections, two
 * ids, independently hideable — do not rebuild either one as the other. (An
 * earlier version of this comment claimed there is no Event model; there is
 * one now — see `prisma/schema.prisma` and `src/server/api/routers/events.ts`.)
 *
 * Hideable.
 */
export function PinkEventsSection({
  heading,
  note,
  body,
  mosaic,
  facts,
  ctaLabel,
  ctaLink,
  ctaNote,
}: Props) {
  // A mosaic where NO tile has an image is a block of bare dark cells — a
  // visible void on a fresh store, not a designed empty state. Individual
  // unset tiles inside an otherwise-filled mosaic still render bare (that IS
  // designed); only the all-empty case collapses.
  const hasMosaic = mosaic.some((row) => rowStr(row, "image"));
  const hasCopy = Boolean(heading || note || body);
  const hasCta = Boolean(ctaLabel || ctaNote);

  // With the session cards gone, the band has to hold up on a fresh store that
  // has uploaded no photos at all: heading + copy + facts + CTA is still a
  // complete section. Only a genuinely empty configuration collapses.
  if (!hasCopy && !hasMosaic && facts.length === 0 && !hasCta) return null;

  return (
    <section
      id="make-and-takes"
      // Only claim a labelled section when there is a heading to label it with —
      // an owner who clears the field would otherwise leave an empty `h2` (and an
      // empty accessible name) behind.
      {...(heading ? { "aria-labelledby": "pink-events-heading" } : {})}
      className="pink-dark px-5 py-16 md:px-10 md:py-24"
      style={{ background: "var(--pink-ink)", color: "var(--pink-paper)" }}
      {...sectionGroupAttr("homepage", "events")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div
          className={`grid gap-10 ${
            facts.length > 0
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-16"
              : "grid-cols-1"
          }`}
        >
          <div className="flex flex-col gap-4">
            {heading && (
              <h2
                id="pink-events-heading"
                className="pink-display text-[clamp(1.625rem,2.8vw,2.375rem)] font-semibold tracking-[-0.025em]"
                style={{ color: "var(--pink-paper)" }}
                {...fieldAttr("pink.homepage.events-heading")}
              >
                {heading}
              </h2>
            )}
            {note && (
              <p
                className="max-w-[52ch] text-[1.0625rem] leading-[1.7]"
                style={{ color: "var(--pink-ink-body)" }}
                {...fieldAttr("pink.homepage.events-note")}
              >
                {note}
              </p>
            )}
            {body && (
              <p
                className="max-w-[60ch] text-[0.9375rem] leading-[1.8]"
                style={{ color: "var(--pink-ink-muted)" }}
                {...fieldAttr("pink.homepage.events-body")}
              >
                {body}
              </p>
            )}
          </div>

          {/* How they're typically hosted. `PinkFactRows` returns null on an
              empty list, so an owner who clears every row loses the rail
              rather than getting empty strips. */}
          {facts.length > 0 && (
            <PinkFactRows rows={facts} surface="dark" className="h-fit" />
          )}
        </div>

        {hasMosaic &&
          (() => {
            // Fixed five-slot bento (`.pink-events-mosaic` in globals.css):
            // rows 6+ from old saved data are silently dropped, and the old
            // per-row colSpan/rowSpan keys are simply never read anymore —
            // the CSS owns the grid now, not the owner's typed spans.
            const shown = mosaic.slice(0, 5);
            return (
              <div className="pink-events-mosaic mt-12">
                {Array.from({ length: 5 }, (_, i) => {
                  const row = shown[i];
                  return (
                    <div
                      key={row?._id ?? i}
                      className={`pink-em-${i} relative overflow-hidden border-2 border-transparent transition-colors duration-300 hover:border-[var(--pink-blush)]`}
                      style={{ background: "var(--pink-ink-tint)" }}
                    >
                      {/* A partial photo set now gets a designed placeholder
                          tile (`PinkImageFallback`) instead of staying bare —
                          five fixed slots make an empty cell read as missing,
                          not intentional negative space. `alt` still falls
                          back to "" (decorative) on filled tiles: a flier the
                          owner has described reads out; an undescribed studio
                          photo stays silent rather than announcing a
                          filename. */}
                      {row && rowStr(row, "image") ? (
                        <Image
                          src={rowStr(row, "image")}
                          alt={rowStr(row, "alt")}
                          fill
                          className="object-cover"
                          sizes={
                            i === 0
                              ? "(max-width: 768px) 100vw, 50vw"
                              : "(max-width: 768px) 50vw, 25vw"
                          }
                        />
                      ) : (
                        <PinkImageFallback
                          surface="dark"
                          className="absolute inset-0"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

        {hasCta && (
          <PinkReveal
            className="mt-12 flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between md:p-8"
            style={{ background: "var(--pink-ink-panel)" }}
          >
            {ctaNote && (
              <p
                className="max-w-[54ch] text-[0.9375rem] leading-[1.7]"
                style={{ color: "var(--pink-ink-body)" }}
                {...fieldAttr("pink.homepage.events-cta-note")}
              >
                {ctaNote}
              </p>
            )}
            {ctaLabel && (
              <Link
                href={ctaLink || "/contact"}
                className="pink-btn pink-btn-solid pink-btn-lg shrink-0 justify-center"
                {...fieldAttr("pink.homepage.events-cta-label")}
              >
                {ctaLabel}
              </Link>
            )}
          </PinkReveal>
        )}
      </div>
    </section>
  );
}
