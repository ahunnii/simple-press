import type { DefaultAboutPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DreamAboutConsultation } from "./dream-about-consultation";
import { DreamAboutStory } from "./dream-about-story";

const FIELD_KEYS = [
  "dream.about.hero-heading",
  "dream.about.hero-accent",
  "dream.about.hero-lede",
  "dream.about.story-portrait",
  "dream.about.story-portrait-alt",
  "dream.about.story-quote-lead",
  "dream.about.story-quote-accent",
  "dream.about.story-paragraph-1",
  "dream.about.story-paragraph-2",
  "dream.about.story-cta-label",
  "dream.about.story-cta-url",
  "dream.about.consultation-heading",
  "dream.about.consultation-lede",
  "dream.about.consultation-step-1-heading",
  "dream.about.consultation-step-1-body",
  "dream.about.consultation-step-2-heading",
  "dream.about.consultation-step-2-body",
  "dream.about.consultation-step-3-heading",
  "dream.about.consultation-step-3-body",
  "dream.about.quote-heading",
  "dream.about.quote-accent",
  "dream.about.quote-lede",
  "dream.about.quote-cta-label",
  "dream.about.quote-cta-url",
];

/**
 * "Meet Selest" — design.md "Per-page section concepts › About": page hero,
 * story (portrait + pull-quote + CTA), consultation steps, closing quote
 * band. Purely CMS/field-driven — no data mutations.
 */
export function DreamAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const businessName = business.name ?? "";
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );

  const steps = [
    {
      heading: f["dream.about.consultation-step-1-heading"] ?? "",
      body: f["dream.about.consultation-step-1-body"] ?? "",
      headingFieldKey: "dream.about.consultation-step-1-heading",
      bodyFieldKey: "dream.about.consultation-step-1-body",
    },
    {
      heading: f["dream.about.consultation-step-2-heading"] ?? "",
      body: f["dream.about.consultation-step-2-body"] ?? "",
      headingFieldKey: "dream.about.consultation-step-2-heading",
      bodyFieldKey: "dream.about.consultation-step-2-body",
    },
    {
      heading: f["dream.about.consultation-step-3-heading"] ?? "",
      body: f["dream.about.consultation-step-3-body"] ?? "",
      headingFieldKey: "dream.about.consultation-step-3-heading",
      bodyFieldKey: "dream.about.consultation-step-3-body",
    },
  ];

  return (
    <div>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.about.hero-heading"] ?? ""}
        accent={f["dream.about.hero-accent"] ?? ""}
        lede={f["dream.about.hero-lede"] ?? ""}
        titleFieldKey="dream.about.hero-heading"
        accentFieldKey="dream.about.hero-accent"
        ledeFieldKey="dream.about.hero-lede"
        sectionAttrs={sectionGroupAttr("about", "hero")}
      />

      <DreamAboutStory
        portrait={f["dream.about.story-portrait"] ?? "/placeholder.svg"}
        portraitAlt={f["dream.about.story-portrait-alt"] ?? ""}
        quoteLead={f["dream.about.story-quote-lead"] ?? ""}
        quoteAccent={f["dream.about.story-quote-accent"] ?? ""}
        paragraph1={f["dream.about.story-paragraph-1"] ?? ""}
        paragraph2={f["dream.about.story-paragraph-2"] ?? ""}
        ctaLabel={f["dream.about.story-cta-label"] ?? ""}
        ctaUrl={f["dream.about.story-cta-url"] ?? "/contact"}
      />

      {isSectionVisible(customFields, "dream", "about.consultation") && (
        <DreamAboutConsultation
          heading={f["dream.about.consultation-heading"] ?? ""}
          lede={f["dream.about.consultation-lede"] ?? ""}
          steps={steps}
        />
      )}

      {isSectionVisible(customFields, "dream", "about.quote") && (
        <DreamQuoteCta
          heading={f["dream.about.quote-heading"] ?? ""}
          accent={f["dream.about.quote-accent"] ?? ""}
          lede={f["dream.about.quote-lede"] ?? ""}
          ctaLabel={f["dream.about.quote-cta-label"] ?? ""}
          ctaUrl={f["dream.about.quote-cta-url"] ?? "/contact"}
          headingFieldKey="dream.about.quote-heading"
          accentFieldKey="dream.about.quote-accent"
          ledeFieldKey="dream.about.quote-lede"
          ctaLabelFieldKey="dream.about.quote-cta-label"
          sectionAttrs={sectionGroupAttr("about", "quote")}
        />
      )}
    </div>
  );
}
