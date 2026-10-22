import Image from "next/image";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { cn } from "~/lib/utils";

import { resolveFields } from "..";
import {
  hasOliveImage,
  OliveButton,
  OliveReveal,
  OliveSection,
} from "../shared";
import {
  DEFAULT_OLIVE_ABOUT_CTA_TILES,
  DEFAULT_OLIVE_ABOUT_STORY,
} from "./index";
import { OliveAboutStory } from "./olive-about-story";

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The olive About page — "three beats" (2026-10-21, client-approved option A,
 * spec: docs/templates/olive/checkpoint/about-simple-2026-10-21/a-three-beats.html).
 *
 * 1. Opening (about.hero + about.manifesto): sand copy panel beside a
 *    photograph that bleeds to the right edge. The page title is the h1, set
 *    small in spaced capitals; the Bodoni statement and its paragraph are the
 *    manifesto, which the owner can hide on its own.
 * 2. Our story (about.story): one sticky photograph beside the paragraphs.
 * 3. Close (about.founding + about.cta): an italic Bodoni line and up to two
 *    buttons, centred between two short rules. Either half can go; with both
 *    gone the close disappears.
 */
export function OliveAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.about.hero-image",
    "olive.about.hero-heading",
    "olive.about.manifesto-heading",
    "olive.about.manifesto-body",
    "olive.about.story-label",
    "olive.about.story-heading",
    "olive.about.founding-line",
  ]);

  // ── Opening ──
  // The page needs its h1, so a blanked title falls back to "About us".
  const savedTitle = (f["olive.about.hero-heading"] ?? "").trim();
  const pageTitle = savedTitle.length > 0 ? savedTitle : "About us";
  const heroImage = f["olive.about.hero-image"] ?? "";
  const hasHeroImage = hasOliveImage(heroImage);
  const showManifesto = isSectionVisible(
    customFields,
    "olive",
    "about.manifesto",
  );
  const statement = f["olive.about.manifesto-heading"]?.trim() ?? "";
  const lede = f["olive.about.manifesto-body"]?.trim() ?? "";
  const hasManifesto =
    showManifesto && (statement.length > 0 || lede.length > 0);

  // ── Story ──
  const storyRows = parseTemplateListRows(customFields?.["olive.about.story"]);
  const hasOwnerStory = storyRows.length > 0;

  // ── Close ──
  const founding = isSectionVisible(customFields, "olive", "about.founding")
    ? (f["olive.about.founding-line"]?.trim() ?? "")
    : "";

  // Carry the ORIGINAL (pre-filter) row index through the label filter so a
  // click on a rendered button still targets the row it came from. Built-in
  // rows get `index: null` — they have no saved row to click-target.
  const ctaRows = parseTemplateListRows(customFields?.["olive.about.cta"]);
  const labelledCtaRows = ctaRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => readString(row, "label").length > 0);
  const ctaButtons: { row: TemplateListRow; index: number | null }[] = (
    isSectionVisible(customFields, "olive", "about.cta")
      ? labelledCtaRows.length > 0
        ? labelledCtaRows
        : DEFAULT_OLIVE_ABOUT_CTA_TILES.map((row) => ({ row, index: null }))
      : []
  ).slice(0, 2);

  return (
    <>
      <section
        aria-label={pageTitle}
        {...sectionGroupAttr("about", "hero")}
        className={cn(
          "olive-about-open",
          hasHeroImage && "olive-about-open-split",
        )}
      >
        {hasHeroImage ? (
          <div className="olive-about-open-media">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="olive-about-open-panel">
          <OliveReveal className="olive-about-open-copy">
            <h1
              className="olive-eyebrow"
              {...fieldAttr("olive.about.hero-heading")}
            >
              {pageTitle}
            </h1>
            {hasManifesto ? (
              <div
                className="olive-about-open-manifesto"
                {...sectionGroupAttr("about", "manifesto")}
              >
                {statement ? (
                  <h2
                    className="olive-h1 olive-about-statement"
                    {...fieldAttr("olive.about.manifesto-heading")}
                  >
                    {statement}
                  </h2>
                ) : null}
                {lede ? (
                  <p
                    className="olive-about-lede"
                    {...fieldAttr("olive.about.manifesto-body")}
                  >
                    {lede}
                  </p>
                ) : null}
              </div>
            ) : null}
          </OliveReveal>
        </div>
      </section>

      {isSectionVisible(customFields, "olive", "about.story") && (
        <OliveAboutStory
          label={f["olive.about.story-label"]?.trim() ?? ""}
          heading={f["olive.about.story-heading"]?.trim() ?? ""}
          rows={hasOwnerStory ? storyRows : DEFAULT_OLIVE_ABOUT_STORY}
          isOwnerData={hasOwnerStory}
        />
      )}

      {founding || ctaButtons.length > 0 ? (
        <OliveSection as="section" aria-label="Where to next" tone="ivory">
          <OliveReveal className="olive-about-close">
            {founding ? (
              <p
                className="olive-about-founding"
                {...sectionGroupAttr("about", "founding")}
                {...fieldAttr("olive.about.founding-line")}
              >
                {founding}
              </p>
            ) : null}
            {ctaButtons.length > 0 ? (
              <div
                className="olive-about-close-buttons"
                {...sectionGroupAttr("about", "cta")}
              >
                {ctaButtons.map(({ row, index }, i) => (
                  <span
                    key={row._id ?? `cta-${i}`}
                    className="inline-flex"
                    {...(index !== null
                      ? listItemAttr("olive.about.cta", index)
                      : {})}
                  >
                    <OliveButton
                      variant={i === 0 ? "solid" : "outline"}
                      arrow
                      href={readString(row, "link") || "/shop"}
                    >
                      {readString(row, "label")}
                    </OliveButton>
                  </span>
                ))}
              </div>
            ) : null}
          </OliveReveal>
        </OliveSection>
      ) : null}
    </>
  );
}
