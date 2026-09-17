import type { DefaultContactPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamContactInfo } from "./dream-contact-info";
import { DreamQuoteForm } from "./dream-quote-form";

const FIELD_KEYS = [
  "dream.contact.hero-heading",
  "dream.contact.hero-accent",
  "dream.contact.hero-lede",
  "dream.contact.form-heading",
  "dream.contact.form-intro",
  "dream.contact.form-theme-helper",
  "dream.contact.form-submit-label",
  "dream.contact.form-success-heading",
  "dream.contact.form-success-body",
  "dream.contact.form-next-heading",
  "dream.contact.form-next-step-1-heading",
  "dream.contact.form-next-step-1-body",
  "dream.contact.form-next-step-2-heading",
  "dream.contact.form-next-step-2-body",
  "dream.contact.form-next-step-3-heading",
  "dream.contact.form-next-step-3-body",
  "dream.contact.info-heading",
  "dream.global.contact-email",
  "dream.global.contact-phone",
  "dream.global.contact-hours",
  "dream.global.service-area",
];

/**
 * "Request an Estimate Quote" — design.md "Per-page section concepts ›
 * Estimate Quote". Page hero, the quote form + "what happens next" aside
 * (client component, gated on the `contactForm` flag inside), and a
 * hideable contact-info band.
 */
export function DreamContactPage({
  business,
}: DefaultContactPageTemplateProps) {
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

  const nextSteps = [
    {
      heading: f["dream.contact.form-next-step-1-heading"] ?? "",
      body: f["dream.contact.form-next-step-1-body"] ?? "",
      headingFieldKey: "dream.contact.form-next-step-1-heading",
      bodyFieldKey: "dream.contact.form-next-step-1-body",
    },
    {
      heading: f["dream.contact.form-next-step-2-heading"] ?? "",
      body: f["dream.contact.form-next-step-2-body"] ?? "",
      headingFieldKey: "dream.contact.form-next-step-2-heading",
      bodyFieldKey: "dream.contact.form-next-step-2-body",
    },
    {
      heading: f["dream.contact.form-next-step-3-heading"] ?? "",
      body: f["dream.contact.form-next-step-3-body"] ?? "",
      headingFieldKey: "dream.contact.form-next-step-3-heading",
      bodyFieldKey: "dream.contact.form-next-step-3-body",
    },
  ];

  return (
    <div>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.contact.hero-heading"] ?? ""}
        accent={f["dream.contact.hero-accent"] ?? ""}
        lede={f["dream.contact.hero-lede"] ?? ""}
        titleFieldKey="dream.contact.hero-heading"
        accentFieldKey="dream.contact.hero-accent"
        ledeFieldKey="dream.contact.hero-lede"
        sectionAttrs={sectionGroupAttr("contact", "hero")}
      />

      <DreamQuoteForm
        heading={f["dream.contact.form-heading"] ?? ""}
        intro={f["dream.contact.form-intro"] ?? ""}
        themeHelper={f["dream.contact.form-theme-helper"] ?? ""}
        submitLabel={f["dream.contact.form-submit-label"] ?? ""}
        successHeading={f["dream.contact.form-success-heading"] ?? ""}
        successBody={f["dream.contact.form-success-body"] ?? ""}
        nextHeading={f["dream.contact.form-next-heading"] ?? ""}
        nextSteps={nextSteps}
      />

      {isSectionVisible(customFields, "dream", "contact.info") && (
        <DreamContactInfo
          heading={f["dream.contact.info-heading"] ?? ""}
          email={f["dream.global.contact-email"] ?? ""}
          phone={f["dream.global.contact-phone"] ?? ""}
          hours={f["dream.global.contact-hours"] ?? ""}
          serviceArea={f["dream.global.service-area"] ?? ""}
        />
      )}
    </div>
  );
}
