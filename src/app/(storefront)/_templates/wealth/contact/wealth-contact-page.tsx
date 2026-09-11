import type { DefaultContactPageTemplateProps } from "../../types";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { WealthHr } from "../shared/wealth-hr";
import { WealthContactForm } from "./wealth-contact-form";
import { WealthContactHero } from "./wealth-contact-hero";
import { WealthContactInfo } from "./wealth-contact-info";

export function WealthContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "wealth.contact.hero-heading",
    "wealth.contact.hero-intro-1",
    "wealth.contact.hero-intro-2",
    "wealth.contact.pathway-1-title",
    "wealth.contact.pathway-1-body",
    "wealth.contact.pathway-1-url",
    "wealth.contact.pathway-2-title",
    "wealth.contact.pathway-2-body",
    "wealth.contact.pathway-2-url",
    "wealth.contact.pathway-3-title",
    "wealth.contact.pathway-3-body",
    "wealth.contact.pathway-3-url",
    "wealth.contact.closing-line",
    "wealth.contact.form-heading",
    "wealth.contact.form-intro",
    "wealth.contact.form-submit-label",
    "wealth.contact.form-success-heading",
    "wealth.contact.form-success-body",
    "wealth.contact.info-address-line1",
    "wealth.contact.info-address-line2",
    "wealth.contact.info-appointment-label",
  ]);

  const pathways = [
    {
      title: f["wealth.contact.pathway-1-title"] ?? "",
      body: f["wealth.contact.pathway-1-body"] ?? "",
      url: f["wealth.contact.pathway-1-url"] ?? "",
      titleKey: "wealth.contact.pathway-1-title",
      bodyKey: "wealth.contact.pathway-1-body",
    },
    {
      title: f["wealth.contact.pathway-2-title"] ?? "",
      body: f["wealth.contact.pathway-2-body"] ?? "",
      url: f["wealth.contact.pathway-2-url"] ?? "",
      titleKey: "wealth.contact.pathway-2-title",
      bodyKey: "wealth.contact.pathway-2-body",
    },
    {
      title: f["wealth.contact.pathway-3-title"] ?? "",
      body: f["wealth.contact.pathway-3-body"] ?? "",
      url: f["wealth.contact.pathway-3-url"] ?? "",
      titleKey: "wealth.contact.pathway-3-title",
      bodyKey: "wealth.contact.pathway-3-body",
    },
  ];

  return (
    <div>
      {/* 1. Contact & Office Hours — not hideable */}
      <WealthContactHero
        heading={f["wealth.contact.hero-heading"] ?? "Contact & Office Hours"}
        intro1={f["wealth.contact.hero-intro-1"] ?? ""}
        intro2={f["wealth.contact.hero-intro-2"] ?? ""}
        pathways={pathways}
        closingLine={f["wealth.contact.closing-line"] ?? ""}
      />

      <WealthHr />

      {/* 2. Contact form — gated on the contactForm platform flag inside */}
      <WealthContactForm
        heading={
          f["wealth.contact.form-heading"] ??
          "We love talking co-ops & community ownership."
        }
        intro={f["wealth.contact.form-intro"] ?? ""}
        submitLabel={f["wealth.contact.form-submit-label"] ?? "Send"}
        successHeading={f["wealth.contact.form-success-heading"] ?? "Message sent"}
        successBody={f["wealth.contact.form-success-body"] ?? ""}
      />

      {isSectionVisible(customFields, "wealth", "contact.info") && (
        <>
          <WealthHr />
          <WealthContactInfo
            addressLine1={f["wealth.contact.info-address-line1"] ?? ""}
            addressLine2={f["wealth.contact.info-address-line2"] ?? ""}
            appointmentLabel={f["wealth.contact.info-appointment-label"] ?? ""}
          />
        </>
      )}
    </div>
  );
}
