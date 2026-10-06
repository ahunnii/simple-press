import { fieldAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";

type DreamEmptyLaneProps = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

/**
 * Designed empty state for the "Lanes" section (design.md "Services index →
 * Lanes → Empty state"): a single centered text block — heading, body, and
 * an Estimate Quote button — with no placeholder photo tile.
 */
export function DreamEmptyLane({
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: DreamEmptyLaneProps) {
  return (
    <div className="mx-auto max-w-[60ch] py-8 text-center">
      <DreamHeading as="h2" fieldKey="dream.services.lanes-empty-heading">
        {heading}
      </DreamHeading>
      {body && (
        <p
          className="!mt-4 text-[17px] leading-relaxed text-[var(--dream-soft)]"
          {...fieldAttr("dream.services.lanes-empty-body")}
        >
          {body}
        </p>
      )}
      {ctaLabel && (
        <div className="mt-6">
          <DreamButton href={ctaUrl} variant="primary">
            <span {...fieldAttr("dream.services.lanes-empty-cta-label")}>
              {ctaLabel}
            </span>
          </DreamButton>
        </div>
      )}
    </div>
  );
}
