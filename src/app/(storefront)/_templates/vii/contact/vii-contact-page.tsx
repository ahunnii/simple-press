import type { DefaultContactPageTemplateProps } from "../../types";
import {
  googleMapsUrls,
  resolveMapCoordinates,
} from "~/lib/address/coordinates";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { isSectionVisible } from "~/lib/sp-meta";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { nonBlank } from "../shared/vii-non-blank";
import { ViiContactHero } from "./vii-contact-hero";
import { ViiContactMain } from "./vii-contact-main";
import { ViiContactMap } from "./vii-contact-map";
import { ViiContactReview } from "./vii-contact-review";

export function ViiContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    // Hero
    "vii.contact.hero-image",
    "vii.contact.hero-overline",
    "vii.contact.hero-heading",
    // Main
    "vii.contact.intro-overline",
    "vii.contact.intro-heading",
    "vii.contact.intro-heading-accent",
    "vii.contact.intro-body",
    "vii.contact.form-heading",
    "vii.contact.form-success-heading",
    "vii.contact.form-success-body",
    // Map
    "vii.contact.map-heading",
    // Review
    "vii.contact.review-heading",
    "vii.contact.review-heading-accent",
    "vii.contact.review-body",
    "vii.contact.review-google-url",
    "vii.contact.review-facebook-url",
  ]);

  // A cleared ("") Settings value resolves to undefined so its block hides.
  const address = nonBlank(business.businessAddress);
  const phone = nonBlank(business.phoneNumber);
  const email = nonBlank(business.supportEmail);

  const hourRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  // Map pin: Settings → General (Business.latitude/longitude) wins. The
  // legacy per-template fields are a read-only fallback for sites that saved
  // coordinates before the pin moved to Settings (retired 2026-09-25) — the
  // saved values are never written to or cleared from here, and their old
  // Detroit defaults are deliberately not applied.
  const coords = resolveMapCoordinates(
    business,
    getRawCustomFieldString(customFields, "vii.contact.map-lat"),
    getRawCustomFieldString(customFields, "vii.contact.map-lng"),
  );
  // The address string is the preferred Google Maps destination; the pin is
  // the fallback.
  const { viewUrl, directionsUrl } = googleMapsUrls(
    address ?? coords ?? { latitude: 0, longitude: 0 },
  );

  const googleUrl = f["vii.contact.review-google-url"]?.trim() ?? "";
  const facebookUrl = f["vii.contact.review-facebook-url"]?.trim() ?? "";

  return (
    <PageTransition>
      {/* 1. Hero */}
      <ViiContactHero
        heroImage={f["vii.contact.hero-image"] ?? undefined}
        overline={f["vii.contact.hero-overline"] ?? ""}
        heading={f["vii.contact.hero-heading"] ?? "Contact Us"}
      />

      {/* 2. Intro + contact info + form */}
      <ViiContactMain
        overline={f["vii.contact.intro-overline"] ?? ""}
        heading={f["vii.contact.intro-heading"] ?? ""}
        headingAccent={f["vii.contact.intro-heading-accent"] ?? ""}
        body={f["vii.contact.intro-body"] ?? ""}
        hourRows={hourRows}
        socialLinks={business.siteContent?.socialLinks}
        formHeading={f["vii.contact.form-heading"] ?? "Send a message"}
        formSuccessHeading={f["vii.contact.form-success-heading"] ?? ""}
        formSuccessBody={f["vii.contact.form-success-body"] ?? ""}
        address={address}
        phone={phone}
        email={email}
      />

      {/* 3. Location map (only when a map pin resolves) */}
      {coords && isSectionVisible(customFields, "vii", "contact.map") && (
        <ViiContactMap
          heading={f["vii.contact.map-heading"] ?? ""}
          businessName={business.name}
          address={address}
          latitude={coords.latitude}
          longitude={coords.longitude}
          viewUrl={viewUrl}
          directionsUrl={directionsUrl}
        />
      )}

      {/* 4. Leave a review (only when at least one URL is set) */}
      {(googleUrl || facebookUrl) &&
        isSectionVisible(customFields, "vii", "contact.review") && (
          <ViiContactReview
            heading={f["vii.contact.review-heading"] ?? ""}
            headingAccent={f["vii.contact.review-heading-accent"] ?? ""}
            body={f["vii.contact.review-body"] ?? ""}
            googleUrl={googleUrl || undefined}
            facebookUrl={facebookUrl || undefined}
          />
        )}
    </PageTransition>
  );
}
