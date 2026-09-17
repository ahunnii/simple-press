import { fieldAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamAlternatingRow } from "./dream-alternating-row";

type DreamEmptyLaneProps = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

/**
 * Designed empty state for the "Lanes" section (design.md "Services index →
 * Lanes → Empty state"): one alternating row with the mark in place of a
 * photo, a heading + body, and an Estimate Quote button.
 */
export function DreamEmptyLane({
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: DreamEmptyLaneProps) {
  return (
    <DreamAlternatingRow media={<DreamPhoto src="" alt="" aspect="4 / 3" />}>
      <DreamHeading as="h2" fieldKey="dream.services.lanes-empty-heading">
        {heading}
      </DreamHeading>
      {body && (
        <p
          className="!mt-4 max-w-[60ch] text-[17px] leading-relaxed text-[var(--dream-soft)]"
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
    </DreamAlternatingRow>
  );
}
