import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamAlternatingRow } from "./dream-alternating-row";

type Service = RouterOutputs["services"]["getAllPublic"][number];

type DreamServiceLaneRowProps = {
  service: Service;
  index: number;
  isLast: boolean;
  seeDetailsLabel: string;
};

/**
 * One published service rendered as an alternating text/image row
 * (design.md "Services index → Lanes"): name, description, "See details"
 * link to `/services/[slug]`, and the service's photo (or its designed
 * fallback) in a `DreamPhoto` frame.
 */
export function DreamServiceLaneRow({
  service,
  index,
  isLast,
  seeDetailsLabel,
}: DreamServiceLaneRowProps) {
  return (
    <DreamAlternatingRow
      reversed={index % 2 === 1}
      divider={!isLast}
      media={
        <DreamPhoto
          src={service.image ?? "/placeholder.svg"}
          alt={service.name}
          aspect="4 / 3"
        />
      }
    >
      <DreamHeading as="h2">{service.name}</DreamHeading>
      {service.description && (
        <p className="!mt-4 max-w-[60ch] text-[17px] leading-relaxed text-[var(--dream-soft)]">
          {service.description}
        </p>
      )}
      <div className="mt-6">
        <DreamButton href={`/services/${service.slug}`} variant="link">
          <span {...fieldAttr("dream.services.lanes-see-details-label")}>
            {seeDetailsLabel}
          </span>
        </DreamButton>
      </div>
    </DreamAlternatingRow>
  );
}
