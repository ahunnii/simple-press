import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamHeading } from "../shared/dream-heading";
import { DreamLink } from "../shared/dream-link";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamSection } from "../shared/dream-section";

type WhatWeDoRow = {
  key: string;
  heading: string;
  headingFieldKey: string;
  body: string;
  bodyFieldKey: string;
  linkLabel: string;
  linkLabelFieldKey: string;
  linkUrl: string;
  photo: string;
  photoAlt: string;
  sidePhoto: string;
  sidePhotoAlt: string;
  /** `"text-image"` reads text→image at ≥1024px; `"image-text"` reverses it. Mobile always renders text first. */
  variant: "text-image" | "image-text";
};

type DreamHomepageWhatWeDoProps = {
  heading: string;
  lede: string;
  rows: WhatWeDoRow[];
};

/**
 * design.md "Per-page section concepts › Homepage" #2: three FIXED
 * alternating rows (text→image, image→text, text→image at ≥1024px; text
 * always renders before image on mobile — enforced by keeping the text
 * column first in DOM order and only reordering visually via `lg:order-*`).
 * Hairline separators via `divide-y` on the row list (design.md: "Rows
 * separated by hairlines, 78px rhythm").
 */
export function DreamHomepageWhatWeDo({
  heading,
  lede,
  rows,
}: DreamHomepageWhatWeDoProps) {
  return (
    <DreamSection
      sectionAttrs={{
        ...sectionGroupAttr("homepage", "what-we-do"),
        id: "what-we-do",
      }}
      aria-label="What We Do"
    >
      <DreamHeading as="h2" fieldKey="dream.homepage.what-we-do-heading">
        {heading}
      </DreamHeading>
      <p
        className="mt-4 max-w-[66ch] text-[var(--dream-soft)]"
        {...fieldAttr("dream.homepage.what-we-do-lede")}
      >
        {lede}
      </p>

      <div className="mt-14 flex flex-col divide-y divide-[var(--dream-line)]">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid items-center gap-10 py-[78px] pb-[110px] first:pt-0 lg:grid-cols-2 lg:gap-16"
          >
            <div className={cn(row.variant === "image-text" && "lg:order-2")}>
              <DreamHeading as="h3" fieldKey={row.headingFieldKey}>
                {row.heading}
              </DreamHeading>
              <p
                className="mt-4 max-w-[60ch] text-[var(--dream-soft)]"
                {...fieldAttr(row.bodyFieldKey)}
              >
                {row.body}
              </p>
              <DreamLink href={row.linkUrl} className="mt-6 inline-block">
                <span {...fieldAttr(row.linkLabelFieldKey)}>
                  {row.linkLabel}
                </span>
              </DreamLink>
            </div>
            <div
              className={cn(
                "relative",
                row.variant === "image-text" && "lg:order-1",
              )}
            >
              <DreamPhoto src={row.photo} alt={row.photoAlt} aspect="4 / 3" />
              {/* Wrapper carries the positioning: `.dream-photo` sets its own
                  `position: relative` in the scoped block, which would beat a
                  Tailwind `absolute` utility placed on the component itself. */}
              <div className="absolute -bottom-8 -left-6 hidden w-[42%] sm:block">
                <DreamPhoto
                  src={row.sidePhoto}
                  alt={row.sidePhotoAlt}
                  aspect="1 / 1"
                  className="shadow-[var(--dream-shadow-card)]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DreamSection>
  );
}
