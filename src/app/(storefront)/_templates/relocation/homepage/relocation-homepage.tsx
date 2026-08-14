import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { relocationTelHref } from "../shared/relocation-phone";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";
import { RelocationBrochureSection } from "./relocation-brochure-section";
import { RelocationFoundersSection } from "./relocation-founders-section";
import { RelocationGallerySection } from "./relocation-gallery-section";
import { RelocationQuoteSection } from "./relocation-quote-section";
import { RelocationReasonsSection } from "./relocation-reasons-section";
import { RelocationServiceAreaSection } from "./relocation-service-area-section";
import { RelocationServicesSection } from "./relocation-services-section";
import { RelocationTestimonialsSection } from "./relocation-testimonials-section";

/**
 * Handy Relocations homepage — the ten sections of design.md → "Per-page
 * section concepts → Homepage", in the order of the reference screenshot
 * (docs/relocation/"Handy Relocations · 2.32pm · 08-06.jpeg"):
 *
 *  1. wave hero            6. 3 great reasons
 *  2. free quote form      7. client testimonials
 *  3. services             8. movers in action gallery
 *  4. founders             9. brochure band
 *  5. service area        10. credentials band (global chrome)
 *
 * Everything below the hero is individually hideable from `/editor`; the
 * credentials band is not gated here because it is shared chrome
 * (`global.credentials`) that also closes Services, Backstory, Reviews,
 * Contact and FAQ — hiding it is a global decision, not a homepage one.
 */
export async function RelocationHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business?.siteContent?.customFields;

  const { isEnabled } = await getBusinessFlags();

  // `testimonial.list` is feature-gated, so skip the call entirely when the
  // flag is off; the catch still covers "no approved reviews yet".
  const testimonials = isEnabled("testimonials")
    ? await api.testimonial.list({ publicOnly: true }).catch(() => [])
    : [];
  const carouselRows = testimonials.map((t) => ({
    id: t.id,
    text: t.text,
    customerName: t.customerName,
  }));

  const f = resolveFields(customFields, [
    "relocation.homepage.hero-heading",
    "relocation.homepage.hero-subheading",
    "relocation.global.branding.hero-cta-label",
    "relocation.homepage.hero-image",
    "relocation.homepage.hero-image-alt",
    "relocation.global.credentials.heading-home",
  ]);

  const heroImage = f["relocation.homepage.hero-image"] ?? "";
  const ctaHref = relocationTelHref(business?.phoneNumber ?? "");
  const ctaLabel =
    ctaHref === ""
      ? ""
      : (f["relocation.global.branding.hero-cta-label"] ?? "");

  const isVisible = (sectionId: string) =>
    isSectionVisible(customFields, "relocation", sectionId);

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.homepage.hero-heading"] ?? ""}
        subtitle={f["relocation.homepage.hero-subheading"] ?? ""}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        photoSrc={heroImage === "" ? undefined : heroImage}
        photoAlt={f["relocation.homepage.hero-image-alt"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("homepage", "hero")}
        titleFieldAttrs={fieldAttr("relocation.homepage.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.homepage.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.global.branding.hero-cta-label")}
      />

      {/*
        The whole band is the free-estimate form, so it is gated on the
        `contactForm` flag as well as its own eye toggle: the form island
        returns null when the flag is off, which would otherwise leave the
        photo and the "GET YOUR FREE MOVING QUOTES HERE" heading stranded above
        nothing.
      */}
      {isVisible("homepage.quote-form") && isEnabled("contactForm") ? (
        <RelocationQuoteSection customFields={customFields} />
      ) : null}

      {isVisible("homepage.services") ? (
        <RelocationServicesSection customFields={customFields} />
      ) : null}

      {isVisible("homepage.founders") ? (
        <RelocationFoundersSection customFields={customFields} />
      ) : null}

      {isVisible("homepage.service-area") ? (
        <RelocationServiceAreaSection customFields={customFields} />
      ) : null}

      {isVisible("homepage.reasons") ? (
        <RelocationReasonsSection customFields={customFields} />
      ) : null}

      {isVisible("homepage.testimonials") ? (
        <RelocationTestimonialsSection
          customFields={customFields}
          testimonials={carouselRows}
        />
      ) : null}

      {isVisible("homepage.gallery") ? (
        <RelocationGallerySection customFields={customFields} />
      ) : null}

      {isVisible("homepage.brochure") ? (
        <RelocationBrochureSection customFields={customFields} />
      ) : null}

      <RelocationCredentialsBand
        customFields={customFields}
        heading={f["relocation.global.credentials.heading-home"] ?? ""}
      />
    </>
  );
}
