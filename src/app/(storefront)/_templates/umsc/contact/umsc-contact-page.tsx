import { Suspense } from "react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscContactForm, UmscContactFormFallback } from "./umsc-contact-form";
import { UmscContactVisit } from "./umsc-contact-visit";

const FIELD_KEYS = [
  // Hero
  "umsc.contact.hero-heading",
  "umsc.contact.hero-lede",
  // Form
  "umsc.contact.form-heading",
  "umsc.contact.toggle-general-label",
  "umsc.contact.toggle-custom-label",
  "umsc.contact.form-submit-label",
  "umsc.contact.form-success-heading",
  "umsc.contact.form-success-body",
  "umsc.contact.expect-heading",
  "umsc.contact.expect-line-1",
  "umsc.contact.expect-line-2",
  "umsc.contact.expect-line-3",
  "umsc.contact.hours",
  // Visit
  "umsc.contact.visit-heading",
  "umsc.contact.visit-body",
  "umsc.contact.visit-link-label",
  "umsc.contact.visit-link-url",
  // Global — business-first, template-override-second (mirrors umsc-footer.tsx)
  "umsc.global.customer-service-phone",
  "umsc.global.google-review-url",
  "umsc.global.instagram-url",
  "umsc.global.facebook-url",
  "umsc.global.tiktok-url",
];

export function UmscContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  // Business-record-first, field-as-override — same source and rule as
  // `layout/umsc-footer.tsx`: a non-empty template field overrides the
  // business record; `||` (not `??`) so an owner-cleared field ("") falls
  // through to the business record.
  const socialLinks = business.siteContent?.socialLinks as
    | { instagram?: string; facebook?: string; tiktok?: string }
    | undefined;
  const phone =
    (f["umsc.global.customer-service-phone"] ?? "").trim() ||
    (business.phoneNumber ?? "");
  const instagramUrl =
    (f["umsc.global.instagram-url"] ?? "").trim() ||
    (socialLinks?.instagram ?? "");
  const facebookUrl =
    (f["umsc.global.facebook-url"] ?? "").trim() ||
    (socialLinks?.facebook ?? "");
  const tiktokUrl =
    (f["umsc.global.tiktok-url"] ?? "").trim() || (socialLinks?.tiktok ?? "");

  return (
    <PageTransition>
      <UmscPageHero
        heading={f["umsc.contact.hero-heading"] ?? ""}
        headingFieldKey="umsc.contact.hero-heading"
        lede={f["umsc.contact.hero-lede"] ?? ""}
        ledeFieldKey="umsc.contact.hero-lede"
        sectionAttrs={sectionGroupAttr("contact", "hero")}
      />

      <Suspense fallback={<UmscContactFormFallback />}>
        <UmscContactForm
          heading={f["umsc.contact.form-heading"] ?? ""}
          generalLabel={f["umsc.contact.toggle-general-label"] ?? ""}
          customLabel={f["umsc.contact.toggle-custom-label"] ?? ""}
          submitLabel={f["umsc.contact.form-submit-label"] ?? ""}
          successHeading={f["umsc.contact.form-success-heading"] ?? ""}
          successBody={f["umsc.contact.form-success-body"] ?? ""}
          aside={{
            heading: f["umsc.contact.expect-heading"] ?? "",
            lines: [
              {
                value: f["umsc.contact.expect-line-1"] ?? "",
                fieldKey: "umsc.contact.expect-line-1",
              },
              {
                value: f["umsc.contact.expect-line-2"] ?? "",
                fieldKey: "umsc.contact.expect-line-2",
              },
              {
                value: f["umsc.contact.expect-line-3"] ?? "",
                fieldKey: "umsc.contact.expect-line-3",
              },
            ],
            phone,
            hours: f["umsc.contact.hours"] ?? "",
            instagramUrl,
            facebookUrl,
            tiktokUrl,
            googleReviewUrl: f["umsc.global.google-review-url"] ?? "",
          }}
        />
      </Suspense>

      {isSectionVisible(customFields, "umsc", "contact.visit") && (
        <UmscContactVisit
          heading={f["umsc.contact.visit-heading"] ?? ""}
          body={f["umsc.contact.visit-body"] ?? ""}
          linkLabel={f["umsc.contact.visit-link-label"] ?? ""}
          linkUrl={f["umsc.contact.visit-link-url"] ?? ""}
        />
      )}
    </PageTransition>
  );
}
