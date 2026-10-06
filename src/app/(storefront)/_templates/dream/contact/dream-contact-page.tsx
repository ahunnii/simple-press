import type { DefaultContactPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { resolveDreamContactDetails } from "../shared/dream-contact-details";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamContactForm } from "./dream-contact-form";
import { DreamContactInfo } from "./dream-contact-info";

const FIELD_KEYS = [
  "dream.contact.hero-heading",
  "dream.contact.hero-accent",
  "dream.contact.hero-lede",
  "dream.contact.form-heading",
  "dream.contact.form-intro",
  "dream.contact.form-submit-label",
  "dream.contact.form-success-heading",
  "dream.contact.form-success-body",
  "dream.contact.event-card-heading",
  "dream.contact.event-card-body",
  "dream.contact.event-card-cta-label",
  "dream.contact.info-heading",
  "dream.global.service-area",
];

/**
 * "Contact us" — a simple "Ask a question" page: hero, the contact form +
 * "Planning an event?" card (client component, gated on the `contactForm`
 * flag inside), and a hideable contact-info band. Event requests go to the
 * Estimate Quote page via the card.
 */
export function DreamContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  const contact = resolveDreamContactDetails(business);

  const businessName = business.name ?? "";
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );

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

      <DreamContactForm
        heading={f["dream.contact.form-heading"] ?? ""}
        intro={f["dream.contact.form-intro"] ?? ""}
        submitLabel={f["dream.contact.form-submit-label"] ?? ""}
        successHeading={f["dream.contact.form-success-heading"] ?? ""}
        successBody={f["dream.contact.form-success-body"] ?? ""}
        eventCardHeading={f["dream.contact.event-card-heading"] ?? ""}
        eventCardBody={f["dream.contact.event-card-body"] ?? ""}
        eventCardCtaLabel={f["dream.contact.event-card-cta-label"] ?? ""}
      />

      {isSectionVisible(customFields, "dream", "contact.info") && (
        <DreamContactInfo
          heading={f["dream.contact.info-heading"] ?? ""}
          email={contact.email}
          phone={contact.phone}
          address={contact.address}
          hoursRows={contact.hoursRows}
          legacyHours={contact.legacyHours}
          serviceArea={f["dream.global.service-area"] ?? ""}
        />
      )}
    </div>
  );
}
