import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { hasOliveImage, OliveReveal, OliveSection } from "../shared";

type Props = {
  label: string;
  heading: string;
  rows: TemplateListRow[];
  /**
   * True when `rows` came from the owner's saved `olive.about.story` list;
   * false when the page fell back to the built-in example rows. Built-in rows
   * have no saved row to click-target, so they never get `listItemAttr`.
   */
  isOwnerData?: boolean;
};

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * about.story — "Our story" (2026-10-21 three-beats rebuild).
 *
 * Two columns from 1024px: ONE photograph (the first row that has a real
 * image, 4:5) held sticky under the header, beside a text column — label,
 * Bodoni heading, then every row as an optional Bodoni h3 over a paragraph,
 * the first paragraph opening on a drop cap. Phones stack photo then text.
 * With no photograph anywhere the text column sits alone, centred.
 *
 * The photograph is never inside a reveal (template rule: sticky elements
 * are never wrapped); only the text column reveals, with `threshold={0}`
 * because four long paragraphs can outgrow the viewport.
 */
export function OliveAboutStory({
  label,
  heading,
  rows,
  isOwnerData = false,
}: Props) {
  const photo =
    rows.map((row) => readString(row, "image")).find(hasOliveImage) ?? "";

  const textRows = rows
    .map((row, index) => ({
      key: row._id ?? `row-${index}`,
      index,
      heading: readString(row, "heading"),
      body: readString(row, "body"),
    }))
    .filter((row) => row.heading.length > 0 || row.body.length > 0);

  if (textRows.length === 0 && !photo) return null;

  const hasPhoto = photo.length > 0;
  const firstBodyIndex = textRows.findIndex((row) => row.body.length > 0);

  return (
    <OliveSection
      as="section"
      {...(heading
        ? { "aria-labelledby": "olive-about-story-heading" }
        : { "aria-label": label || "Our story" })}
      tone="ivory"
      {...sectionGroupAttr("about", "story")}
      className={cn("olive-about-story", hasPhoto && "olive-about-story-split")}
    >
      {hasPhoto ? (
        <div className="olive-about-story-photo">
          <div className="olive-about-story-frame">
            <Image
              src={photo}
              alt=""
              fill
              sizes="(max-width: 1023px) min(100vw, 30rem), 45vw"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      <OliveReveal threshold={0} className="olive-about-story-text">
        {label ? (
          <span
            className="olive-eyebrow"
            {...fieldAttr("olive.about.story-label")}
          >
            {label}
          </span>
        ) : null}
        {heading ? (
          <h2
            id="olive-about-story-heading"
            className="olive-h2 olive-about-story-heading"
            {...fieldAttr("olive.about.story-heading")}
          >
            {heading}
          </h2>
        ) : null}

        {textRows.map((row, i) => (
          <div
            key={row.key}
            className="olive-about-story-row"
            {...(isOwnerData
              ? listItemAttr("olive.about.story", row.index)
              : {})}
          >
            {row.heading ? <h3 className="olive-h3">{row.heading}</h3> : null}
            {row.body ? (
              <p
                className={cn(
                  "olive-about-story-body",
                  i === firstBodyIndex && "olive-about-dropcap",
                )}
              >
                {row.body}
              </p>
            ) : null}
          </div>
        ))}
      </OliveReveal>
    </OliveSection>
  );
}
