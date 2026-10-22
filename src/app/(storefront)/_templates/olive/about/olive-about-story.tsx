import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import {
  hasOliveImage,
  OliveImageFallback,
  OliveReveal,
  OliveSection,
} from "../shared";

type Props = {
  rows: TemplateListRow[];
  /**
   * True when `rows` came from the owner's saved `olive.about.story` list;
   * false when the page fell back to `DEFAULT_STORY` because that list was
   * empty. Built-in rows have no matching saved row to click-target, so they
   * never get `listItemAttr`.
   */
  isOwnerData?: boolean;
};

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/**
 * about.story — up to 4 rows, alternating photo card / text band. The
 * heading renders only when one is provided. Never hidden by
 * the owner (not in `hideable` set); an empty list falls back to the page's
 * own built-in example rows so the section is never blank.
 */
export function OliveAboutStory({ rows, isOwnerData = false }: Props) {
  const filteredRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const image = readString(row, "image");
      const heading = readString(row, "heading");
      const body = readString(row, "body");
      return (
        image.trim().length > 0 ||
        heading.trim().length > 0 ||
        body.trim().length > 0
      );
    });

  if (filteredRows.length === 0) return null;

  return (
    <OliveSection
      as="section"
      aria-label="Our story"
      tone="ivory"
      {...sectionGroupAttr("about", "story")}
      className="flex flex-col gap-10 sm:gap-16"
    >
      {filteredRows.map(({ row, index }, i) => {
        const image = readString(row, "image");
        const heading = readString(row, "heading");
        const body = readString(row, "body");
        const hasHeading = heading.trim().length > 0;
        const reversed = i % 2 === 1;

        return (
          <OliveReveal key={row._id ?? index}>
            <div
              {...(isOwnerData ? listItemAttr("olive.about.story", index) : {})}
              className={cn(
                "flex flex-col gap-6 sm:items-center sm:gap-10",
                reversed ? "sm:flex-row-reverse" : "sm:flex-row",
              )}
            >
              <div
                className="relative w-full overflow-hidden sm:w-1/2"
                style={{ aspectRatio: "4 / 3" }}
              >
                {hasOliveImage(image) ? (
                  <Image
                    src={image}
                    alt={heading}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <OliveImageFallback className="absolute inset-0" />
                )}
              </div>

              <div
                className="flex w-full flex-col gap-4 p-6 sm:w-1/2 sm:p-10"
                style={{ backgroundColor: "var(--olive-sand)" }}
              >
                {hasHeading && <h3 className="olive-h3">{heading}</h3>}
                {body ? (
                  <p
                    className="max-w-[46ch] text-[0.9375rem] leading-[1.7]"
                    style={{ color: "var(--olive-ink-soft)" }}
                  >
                    {body}
                  </p>
                ) : null}
              </div>
            </div>
          </OliveReveal>
        );
      })}
    </OliveSection>
  );
}
