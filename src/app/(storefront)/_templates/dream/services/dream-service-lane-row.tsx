import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamAlternatingRow } from "./dream-alternating-row";
import { dreamLaneImageFit } from "./service-pages/fields";

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
 *
 * The whole row is clickable via the stretched-link pattern: the single
 * "See details" `<a>` carries an `::after` that fills the row (bounded by the
 * row's `relative`, stopping above the row's bottom padding so it never
 * leaks into the divider gap). The visible label is the link's accessible
 * name, plus an sr-only service name so each link is unique; the photo is
 * decorative (`alt=""`). Keyboard focus rings the whole row (on the
 * pseudo-element), hover underlines the title and zooms the photo.
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
      className="group relative"
      media={
        <DreamPhoto
          src={service.image ?? "/placeholder.svg"}
          alt=""
          aspect="4 / 3"
          fit={dreamLaneImageFit(service.customFields, "dream-lane.image-crop")}
          className="motion-safe:group-hover:[&_.dream-photo-img]:scale-[1.02]"
        />
      }
    >
      <DreamHeading
        as="h2"
        className="underline decoration-transparent decoration-1 underline-offset-[10px] transition-[text-decoration-color] duration-300 group-hover:decoration-[var(--dream-rose)] group-has-[:focus-visible]:decoration-[var(--dream-rose)] motion-reduce:transition-none"
      >
        {service.name}
      </DreamHeading>
      {service.description && (
        <p className="!mt-4 max-w-[60ch] text-[17px] leading-relaxed text-[var(--dream-soft)]">
          {service.description}
        </p>
      )}
      <div className="mt-6">
        <DreamButton
          href={`/services/${service.slug}`}
          variant="link"
          className="group-hover:text-[var(--dream-ink)]! group-hover:decoration-[var(--dream-rose)]! after:absolute after:inset-x-0 after:top-0 after:bottom-12 after:z-[1] after:rounded-[var(--dream-radius-photo)] after:content-[''] focus-visible:outline-none! focus-visible:after:outline-2 focus-visible:after:outline-offset-8 focus-visible:after:outline-[color:var(--dream-rose)]"
        >
          <span
            className="relative z-[2]"
            {...fieldAttr("dream.services.lanes-see-details-label")}
          >
            {seeDetailsLabel}
          </span>
          <span className="sr-only"> about {service.name}</span>
        </DreamButton>
      </div>
    </DreamAlternatingRow>
  );
}
