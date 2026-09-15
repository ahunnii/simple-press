import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { OliveImageTile, OliveRevealGroup, OliveSection } from "../shared";
import { OliveAboutHero } from "./olive-about-hero";
import { OliveAboutStory } from "./olive-about-story";

// Built-in example story, used when the owner hasn't configured any rows.
const DEFAULT_STORY: TemplateListRow[] = [
  {
    _id: "default-story-1",
    image: "",
    heading: "Started on a card table",
    body: "Olive Mode began as a folding table at Eastern Market — a rack of dresses and a handwritten sign. We sold out by noon and ordered more the next week.",
  },
  {
    _id: "default-story-2",
    image: "",
    heading: "Every fabric, chosen by hand",
    body: "We touch every fabric before it goes on the floor. If it wrinkles wrong or doesn't feel right against your skin, it doesn't make the cut.",
  },
  {
    _id: "default-story-3",
    image: "",
    heading: "A shop that remembers you",
    body: "We keep notes — your size, the dress you almost bought last spring, the color you always reach for. Walk in and we'll likely have something pulled already.",
  },
  {
    _id: "default-story-4",
    image: "",
    heading: "Still here, still Detroit",
    body: "We've grown from one folding table to a real shop on a real block, and neither has changed much. Come try things on and stay as long as you like.",
  },
];

// Built-in example tiles, used when the owner hasn't configured any rows.
const DEFAULT_CTA_TILES: TemplateListRow[] = [
  { _id: "default-cta-1", image: "", label: "Shop new", link: "/shop" },
  {
    _id: "default-cta-2",
    image: "",
    label: "Read the journal",
    link: "/blog",
  },
  { _id: "default-cta-3", image: "", label: "Say hello", link: "/contact" },
];

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
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
  const story = storyRows.length > 0 ? storyRows : DEFAULT_STORY;

  const ctaRows = parseTemplateListRows(customFields?.["olive.about.cta"]);
  const ctaTiles = ctaRows.length > 0 ? ctaRows : DEFAULT_CTA_TILES;

  return (
    <>
      <OliveAboutHero
        image={f["olive.about.hero-image"] ?? "/placeholder.svg"}
        heading={f["olive.about.hero-heading"] ?? "About Olive Mode"}
      />

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

      <OliveAboutStory rows={story} />

      <OliveSection
        as="section"
        aria-label="Since"
        tone="white"
        {...sectionGroupAttr("about", "founding")}
        className="mx-auto flex max-w-[520px] flex-col items-center border-y border-[var(--olive-hairline)] py-8 text-center"
      >
        <p className="olive-label" {...fieldAttr("olive.about.founding-line")}>
          {f["olive.about.founding-line"] ?? ""}
        </p>
      </OliveSection>

      {isSectionVisible(customFields, "olive", "about.cta") && (
        <OliveSection
          as="section"
          aria-label="Where to next"
          tone="paper"
          {...sectionGroupAttr("about", "cta")}
        >
          <OliveRevealGroup
            fan
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {ctaTiles.map((row, i) => {
              const image = readString(row, "image");
              const label = readString(row, "label");
              const link = readString(row, "link") || "/";

              return (
                <div
                  key={row._id ?? i}
                  className="olive-reveal-item"
                  style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                >
                  <OliveImageTile
                    image={image || "/placeholder.svg"}
                    alt={label}
                    label={label}
                    href={link}
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
