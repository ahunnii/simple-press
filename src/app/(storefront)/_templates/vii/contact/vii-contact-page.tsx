import type { DefaultContactPageTemplateProps } from "../../types";
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
    "vii.contact.hours",
    "vii.contact.form-heading",
    // Map
    "vii.contact.map-heading",
    "vii.contact.map-image",
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

  const mapImage = f["vii.contact.map-image"]?.trim() ?? "";
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : undefined;

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
        hours={f["vii.contact.hours"] ?? ""}
        formHeading={f["vii.contact.form-heading"] ?? "Send a message"}
        address={address}
        phone={phone}
        email={email}
      />

      {/* 3. Location map (only when configured) */}
      {mapImage && (
        <ViiContactMap
          heading={f["vii.contact.map-heading"] ?? ""}
          mapImage={mapImage}
          mapsUrl={mapsUrl}
        />
      )}

      {/* 4. Leave a review (only when at least one URL is set) */}
      {(googleUrl || facebookUrl) && (
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
