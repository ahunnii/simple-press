import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
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
    // Map
    "vii.contact.map-heading",
    "vii.contact.map-lat",
    "vii.contact.map-lng",
    // Review
    "vii.contact.review-heading",
    "vii.contact.review-heading-accent",
    "vii.contact.review-body",
    "vii.contact.review-google-url",
    "vii.contact.review-facebook-url",
  ]);

  const address = business.businessAddress ?? undefined;
  const phone = business.phoneNumber ?? undefined;
  const email = business.supportEmail ?? undefined;

  const socialLinks = business.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        youtube?: string;
        linkedin?: string;
        pinterest?: string;
      }
    | undefined;

  const hourRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const lat = Number(f["vii.contact.map-lat"]);
  const lng = Number(f["vii.contact.map-lng"]);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

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
        socialLinks={socialLinks}
        formHeading={f["vii.contact.form-heading"] ?? "Send a message"}
        address={address}
        phone={phone}
        email={email}
      />

      {/* 3. Location map (only when coordinates are configured) */}
      {hasCoords && (
        <ViiContactMap
          heading={f["vii.contact.map-heading"] ?? ""}
          businessName={business.name}
          address={address}
          latitude={lat}
          longitude={lng}
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
