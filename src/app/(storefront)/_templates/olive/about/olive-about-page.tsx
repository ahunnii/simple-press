import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { OliveImageTile, OliveRevealGroup, OliveSection } from "../shared";
import { DEFAULT_OLIVE_ABOUT_CTA_TILES, DEFAULT_OLIVE_ABOUT_STORY } from "./index";
import { OliveAboutHero } from "./olive-about-hero";
import { OliveAboutStory } from "./olive-about-story";

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function ctaGridClass(count: number): string {
  if (count === 1) return "grid grid-cols-1 gap-3 sm:mx-auto sm:max-w-[40rem]";
  if (count === 2) return "grid grid-cols-1 gap-3 sm:grid-cols-2";
  return "grid grid-cols-1 gap-3 sm:grid-cols-3";
}

function ctaSizes(count: number): string {
  if (count === 1) return "(max-width: 640px) 100vw, 640px";
  if (count === 2) return "(max-width: 640px) 100vw, 50vw";
  return "(max-width: 640px) 100vw, 33vw";
}

export function OliveAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.about.hero-image",
    "olive.about.hero-heading",
    "olive.about.manifesto-heading",
    "olive.about.manifesto-body",
    "olive.about.founding-line",
  ]);

  const storyRows = parseTemplateListRows(customFields?.["olive.about.story"]);
  const hasOwnerStory = storyRows.length > 0;
  const story = hasOwnerStory ? storyRows : DEFAULT_OLIVE_ABOUT_STORY;

  const founding = (f["olive.about.founding-line"] ?? "").trim();

  // Carry the ORIGINAL (pre-filter) row index through the label filter so a
  // click on a rendered tile still targets the row it actually came from,
  // even when an earlier row was skipped for having no label. Built-in
  // `DEFAULT_OLIVE_ABOUT_CTA_TILES` rows get `index: null` — they have no saved row to
  // click-target.
  const ctaRows = parseTemplateListRows(customFields?.["olive.about.cta"]);
  const labelledCtaRows = ctaRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => readString(row, "label").trim().length > 0);
  const ctaTiles: { row: TemplateListRow; index: number | null }[] =
    labelledCtaRows.length > 0
      ? labelledCtaRows
      : DEFAULT_OLIVE_ABOUT_CTA_TILES.map((row) => ({ row, index: null }));

  return (
    <>
      <OliveAboutHero
        image={f["olive.about.hero-image"] ?? "/placeholder.svg"}
        heading={f["olive.about.hero-heading"] ?? "About us"}
      />

      {isSectionVisible(customFields, "olive", "about.manifesto") && (
        <OliveSection
          as="section"
          aria-label="Our approach"
          tone="paper"
          {...sectionGroupAttr("about", "manifesto")}
          className="mx-auto flex max-w-[52rem] flex-col items-center gap-4 text-center"
        >
          <h2
            className="olive-display"
            {...fieldAttr("olive.about.manifesto-heading")}
          >
            {f["olive.about.manifesto-heading"] ?? ""}
          </h2>
          {f["olive.about.manifesto-body"] ? (
            <p
              className="max-w-[62ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
              {...fieldAttr("olive.about.manifesto-body")}
            >
              {f["olive.about.manifesto-body"]}
            </p>
          ) : null}
        </OliveSection>
      )}

      {isSectionVisible(customFields, "olive", "about.story") && (
        <OliveAboutStory rows={story} isOwnerData={hasOwnerStory} />
      )}

      {isSectionVisible(customFields, "olive", "about.founding") &&
        founding.length > 0 && (
          <OliveSection
            as="section"
            aria-label="Since"
            tone="white"
            {...sectionGroupAttr("about", "founding")}
            className="mx-auto flex max-w-[520px] flex-col items-center border-y border-[var(--olive-hairline)] py-8 text-center"
          >
            <p
              className="olive-label"
              {...fieldAttr("olive.about.founding-line")}
            >
              {founding}
            </p>
          </OliveSection>
        )}

      {isSectionVisible(customFields, "olive", "about.cta") && (
        <OliveSection
          as="section"
          aria-label="Where to next"
          tone="paper"
          {...sectionGroupAttr("about", "cta")}
        >
          {/* Grid sizes adapt to tile count: 1 tile centers at 640px, 2 tiles split 50/50, 3+ tiles split into thirds */}
          <OliveRevealGroup fan className={ctaGridClass(ctaTiles.length)}>
            {ctaTiles.map(({ row, index }, i) => {
              const image = readString(row, "image");
              const label = readString(row, "label");
              const link = readString(row, "link") || "/";

              return (
                <div
                  key={row._id ?? i}
                  {...(index !== null
                    ? listItemAttr("olive.about.cta", index)
                    : {})}
                  className="olive-reveal-item"
                  style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                >
                  <OliveImageTile
                    image={image || "/placeholder.svg"}
                    alt={label}
                    label={label}
                    href={link}
                    sizes={ctaSizes(ctaTiles.length)}
                  />
                </div>
              );
            })}
          </OliveRevealGroup>
        </OliveSection>
      )}
    </>
  );
}
