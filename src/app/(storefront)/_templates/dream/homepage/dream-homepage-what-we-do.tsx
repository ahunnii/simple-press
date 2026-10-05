import type { DreamWhatWeDoRow } from "./dream-homepage-what-we-do-rows";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamHeading } from "../shared/dream-heading";
import { DreamLink } from "../shared/dream-link";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamSection } from "../shared/dream-section";
import { DREAM_WHAT_WE_DO_ROWS_KEY } from "./dream-homepage-what-we-do-rows";

type WhatWeDoRow = DreamWhatWeDoRow & {
  /** B2.5: false when the link has no label or `linkUrl` points at a flag-disabled route — hide the link, never swap its destination. */
  linkVisible: boolean;
};

type DreamHomepageWhatWeDoProps = {
  heading: string;
  lede: string;
  rows: WhatWeDoRow[];
};

/**
 * design.md "Per-page section concepts › Homepage" #2: the owner's rows
 * (`dream.homepage.what-we-do-rows`, 1–6, three by default) alternate
 * text→image, image→text, … at ≥1024px by position — even rows put the text
 * first, odd rows reverse it. Text always renders before image on mobile —
 * enforced by keeping the text column first in DOM order and only reordering
 * visually via `lg:order-*`. Hairline separators via `divide-y` on the row
 * list (design.md: "Rows separated by hairlines, 78px rhythm").
 *
 * The smaller side photo shows when the owner picked one, and also when the
 * row has no main photo either — so a fresh store keeps the designed
 * two-placeholder composition. An empty `sideAlt` renders it as decorative.
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
        {rows.map((row, i) => {
          const variant = i % 2 === 0 ? "text-image" : "image-text";
          const showSidePhoto = row.sideImage !== "" || row.image === "";
          return (
            <div
              key={i}
              className="grid items-center gap-10 py-[78px] pb-[110px] first:pt-0 lg:grid-cols-2 lg:gap-16"
              {...listItemAttr(DREAM_WHAT_WE_DO_ROWS_KEY, i)}
            >
              <div className={cn(variant === "image-text" && "lg:order-2")}>
                {row.heading && (
                  <DreamHeading as="h3">{row.heading}</DreamHeading>
                )}
                {row.body && (
                  <p className="mt-4 max-w-[60ch] text-[var(--dream-soft)]">
                    {row.body}
                  </p>
                )}
                {row.linkVisible && (
                  <DreamLink href={row.linkUrl} className="mt-6 inline-block">
                    {row.linkLabel}
                  </DreamLink>
                )}
              </div>
              <div
                className={cn(
                  "relative",
                  variant === "image-text" && "lg:order-1",
                )}
              >
                <DreamPhoto src={row.image} alt={row.alt} aspect="4 / 3" />
                {/* Wrapper carries the positioning: `.dream-photo` sets its own
                    `position: relative` in the scoped block, which would beat a
                    Tailwind `absolute` utility placed on the component itself. */}
                {showSidePhoto && (
                  <div className="absolute -bottom-8 -left-6 hidden w-[42%] sm:block">
                    <DreamPhoto
                      src={row.sideImage}
                      alt={row.sideAlt}
                      aspect="1 / 1"
                      className="shadow-[var(--dream-shadow-card)]"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DreamSection>
  );
}
