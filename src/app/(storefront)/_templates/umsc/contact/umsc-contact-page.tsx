import { Suspense } from "react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { resolveUmscContactDetails } from "../shared/umsc-contact-details";
import { resolveUmscHeroPhoto } from "../shared/umsc-hero-fields";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscContactForm, UmscContactFormFallback } from "./umsc-contact-form";
import { UmscContactFollow } from "./umsc-contact-follow";

const FIELD_KEYS = [
  // Hero
  "umsc.contact.hero-heading",
  "umsc.contact.hero-lede",
  "umsc.contact.hero-image",
  "umsc.contact.hero-image-alt",
  "umsc.contact.hero-image-behind",
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
  // Follow on social (group id + keys stay `visit`)
  "umsc.contact.visit-heading",
  "umsc.contact.visit-body",
  // Global
  "umsc.global.google-review-url",
];

export function UmscContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  // Settings (phone, hours) and Content → Branding (social links) own this
  // data; saved values from the retired `umsc.global.*` / `umsc.contact.hours`
  // fields are read only as a silent fallback — see
  // `resolveUmscContactDetails`.
  const { phone, hoursRows, legacyHours, socials } =
    resolveUmscContactDetails(business);

  // The "Follow" band carries the large social icons; while it is showing the
  // aside drops its small copy so they never appear twice. Hidden band (or no
  // socials) → the aside keeps them, so socials are never lost.
  const followBandShown =
    isSectionVisible(customFields, "umsc", "contact.visit") &&
    socials.length > 0;

  return (
    <PageTransition>
      <UmscPageHero
        heading={f["umsc.contact.hero-heading"] ?? ""}
        headingFieldKey="umsc.contact.hero-heading"
        lede={f["umsc.contact.hero-lede"] ?? ""}
        ledeFieldKey="umsc.contact.hero-lede"
        {...resolveUmscHeroPhoto(f, "contact")}
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
            hoursRows,
            legacyHours,
            socials: followBandShown ? [] : socials,
            googleReviewUrl: f["umsc.global.google-review-url"] ?? "",
          }}
        />
      </Suspense>

      {followBandShown && (
        <UmscContactFollow
          heading={f["umsc.contact.visit-heading"] ?? ""}
          body={f["umsc.contact.visit-body"] ?? ""}
          socials={socials}
        />
      )}
    </PageTransition>
  );
}
