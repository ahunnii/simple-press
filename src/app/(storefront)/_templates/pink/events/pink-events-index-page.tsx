import type { DefaultEventsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { PinkCtaPanel } from "../shared/pink-cta-panel";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { hasCustomImage } from "../shared/pink-image-fallback";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkEventCard } from "./pink-event-card";

/**
 * First candidate that actually has visible text.
 *
 * A chain of `??` would be wrong here: an owner who clears a label field
 * leaves an empty STRING behind, not null, and `??` passes that straight
 * through — rendering a link with no text and no accessible name. Mirrors the
 * same guard on the default template's events page.
 */
function firstNonBlank(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  return candidates.find((candidate) => candidate?.trim()) ?? undefined;
}

/**
 * `/events` — every published, not-yet-over `Event` for this business, newest
 * date first, as returned by `events.getUpcomingPublic`.
 *
 * NOT the homepage "Make & Takes" band (`homepage.events`), which is an
 * evergreen, field-driven explainer with no dates at all. The homepage's
 * DB-backed preview of this page is `homepage.upcoming`.
 *
 * Structural model: `pink-services-index-page.tsx` — flat page header, a
 * hairline grid of records, a closing CTA panel. Stays a server component so
 * `resolveFields` and `isSectionVisible` run on the server; only the card is
 * `"use client"` (it opens the flier lightbox).
 */
export async function PinkEventsIndexPage({
  business,
  events,
  timeZone,
}: DefaultEventsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pink.events.header-heading",
    "pink.events.header-intro",
    "pink.events.list-flier-hint",
    "pink.events.list-link-fallback-label",
    "pink.events.list-empty-heading",
    "pink.events.list-empty-body",
    "pink.events.list-empty-cta-label",
    "pink.events.list-empty-cta-link",
    "pink.events.cta-heading",
    "pink.events.cta-body",
    "pink.events.cta-primary-label",
    "pink.events.cta-primary-link",
    "pink.events.cta-image-1",
    "pink.events.cta-image-2",
  ]);

  const linkFallbackLabel = f["pink.events.list-link-fallback-label"] ?? "";
  const flierHint = f["pink.events.list-flier-hint"] ?? "";

  // "Tap a flier" is a lie on a calendar where nobody has uploaded one, so the
  // hint only appears once there is something to tap.
  const hasAnyFlier = events.some((event) => hasCustomImage(event.coverImage));

  const ctaImages = [
    f["pink.events.cta-image-1"] ?? "",
    f["pink.events.cta-image-2"] ?? "",
  ].filter(hasCustomImage);

  return (
    <div className="flex flex-col">
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <PinkPageHeader
        sectionAttrs={sectionGroupAttr("events", "header")}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Events" }]}
        heading={f["pink.events.header-heading"] ?? ""}
        headingFieldKey="pink.events.header-heading"
        intro={f["pink.events.header-intro"] ?? ""}
        introFieldKey="pink.events.header-intro"
      />

      {/* ── 2. List ───────────────────────────────────────────────────────── */}
      <section
        className="mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-20"
        aria-label="Upcoming events"
        {...sectionGroupAttr("events", "list")}
      >
        {events.length === 0 ? (
          <PinkEmptyState
            heading={
              firstNonBlank(
                f["pink.events.list-empty-heading"],
                "Nothing on the calendar yet",
              ) ?? "Nothing on the calendar yet"
            }
            body={f["pink.events.list-empty-body"] ?? ""}
            ctaLabel={firstNonBlank(f["pink.events.list-empty-cta-label"])}
            ctaHref={firstNonBlank(
              f["pink.events.list-empty-cta-link"],
              "/shop",
            )}
          />
        ) : (
          <>
            {hasAnyFlier && flierHint && (
              <p className="pink-label mb-8">{flierHint}</p>
            )}

            <PinkHairlineGrid columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <PinkReveal key={event.id} index={i}>
                  <PinkEventCard
                    event={event}
                    timeZone={timeZone}
                    // Per-event label first, then the owner's template-wide
                    // fallback, then a hardcoded one — a cleared field must
                    // never leave an unnamed link behind.
                    linkLabel={
                      firstNonBlank(
                        event.externalUrlLabel,
                        linkFallbackLabel,
                        "Details & tickets",
                      ) ?? "Details & tickets"
                    }
                    priority={i < 3}
                  />
                </PinkReveal>
              ))}
            </PinkHairlineGrid>
          </>
        )}
      </section>

      {/* ── 3. Closing CTA ────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "events.cta") && (
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 md:px-10 md:pb-20">
          <PinkReveal>
            <PinkCtaPanel
              sectionAttrs={sectionGroupAttr("events", "cta")}
              heading={f["pink.events.cta-heading"] ?? ""}
              headingFieldKey="pink.events.cta-heading"
              body={f["pink.events.cta-body"] ?? ""}
              bodyFieldKey="pink.events.cta-body"
              primaryCta={
                f["pink.events.cta-primary-label"]
                  ? {
                      label: f["pink.events.cta-primary-label"] ?? "",
                      href: f["pink.events.cta-primary-link"] ?? "/contact",
                    }
                  : undefined
              }
              // Only pass images once the owner has supplied a real one: the
              // panel falls back to `/placeholder.svg` per slot, and pink
              // deliberately never shows the platform placeholder (audit
              // 2026-07-31, P2-7). With none set the panel runs copy-only.
              images={
                ctaImages.length > 0
                  ? ctaImages.map((src) => ({ src, alt: "" }))
                  : undefined
              }
            />
          </PinkReveal>
        </div>
      )}
    </div>
  );
}
