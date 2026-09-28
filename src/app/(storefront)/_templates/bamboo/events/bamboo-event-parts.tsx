import { CalendarDays } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

/**
 * Shared bamboo vocabulary for the events index + detail pages, so an event
 * reads the same in both places. Tokens only (docs/templates/bamboo/design.md
 * "Palette"); card = the blog/contact hairline card, pill = the forest CTA
 * pill, eyebrow = the compact (`text-xs`) gold eyebrow tier.
 */
export const BAMBOO_EVENT_CARD =
  "bg-card overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-shadow hover:shadow-md";

export const BAMBOO_EVENT_EYEBROW =
  "inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase";

export const BAMBOO_EVENT_CHIP =
  "text-foreground inline-flex items-center rounded-full border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] px-4 py-1.5 text-sm font-semibold";

export const BAMBOO_EVENT_PILL =
  "group rounded-full bg-[var(--bam-forest)] text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]";

/**
 * Designed "no upcoming events" state: the gold-ringed icon disc from the
 * contact success card over a hairline card, left on the container edge
 * (B1.7) at a readable width. Copy comes from `default.events.list-empty-*`.
 */
export function BambooEventsEmptyState({
  heading,
  body,
}: {
  heading: string;
  body?: string;
}) {
  return (
    <FadeIn direction="up">
      <div className="bg-card flex max-w-3xl flex-col items-center rounded-2xl border border-[var(--bam-hairline)] px-6 py-16 text-center md:py-20">
        <div className="flex size-16 items-center justify-center rounded-full border border-[var(--bam-gold)]/40 bg-[var(--bam-gold)]/10">
          <CalendarDays
            className="size-7 text-[var(--bam-forest)]"
            aria-hidden="true"
          />
        </div>
        <h2
          className="text-foreground mt-6 text-xl font-semibold"
          {...fieldAttr("default.events.list-empty-heading")}
        >
          {heading}
        </h2>
        {body ? (
          <p
            className="text-muted-foreground mt-2 max-w-md leading-relaxed"
            {...fieldAttr("default.events.list-empty-body")}
          >
            {body}
          </p>
        ) : null}
      </div>
    </FadeIn>
  );
}
