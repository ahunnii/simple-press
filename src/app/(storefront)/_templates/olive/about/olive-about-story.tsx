import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import {
  hasOliveImage,
  OliveImageFallback,
  OliveLeafMark,
  OliveReveal,
  OliveSection,
} from "../shared";

type Props = {
  rows: TemplateListRow[];
};

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/**
 * about.story — up to 4 rows, alternating photo card / text band. Never
 * hidden by the owner (not in `hideable` set); an empty list falls back to
 * the page's own built-in example rows so the section is never blank.
 */
export function OliveAboutStory({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <OliveSection
      as="section"
      aria-label="Our story"
      tone="white"
      {...sectionGroupAttr("about", "story")}
      className="flex flex-col gap-10 sm:gap-16"
    >
      {rows.map((row, i) => {
        const image = readString(row, "image");
        const heading = readString(row, "heading");
        const body = readString(row, "body");
        const reversed = i % 2 === 1;

        return (
          <OliveReveal
            key={row._id ?? i}
            className={cn(
              "flex flex-col gap-6 sm:items-center sm:gap-10",
              reversed ? "sm:flex-row-reverse" : "sm:flex-row",
            )}
          >
            <div
              className="relative w-full overflow-hidden sm:w-1/2"
              style={{
                aspectRatio: "4 / 3",
                borderRadius: "var(--olive-card-radius)",
              }}
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

            <div className="olive-card olive-card-paper flex w-full flex-col gap-3 p-6 sm:w-1/2 sm:p-8">
              <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
                <OliveLeafMark size={20} />
              </span>
              <h3 className="olive-h3">{heading}</h3>
              {body ? (
                <p className="olive-caption max-w-[46ch]">{body}</p>
              ) : null}
            </div>
          </OliveReveal>
        );
      })}
    </OliveSection>
  );
}
