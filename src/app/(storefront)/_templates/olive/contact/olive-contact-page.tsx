import type { DefaultContactPageTemplateProps } from "../../types";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";
import {
  googleMapsUrls,
  resolveMapCoordinates,
} from "~/lib/address/coordinates";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRawCustomFieldString,
  resolveFaqPickerItems,
} from "~/lib/template-fields";

import { resolveFields } from "..";
import {
  OliveAccordion,
  OliveAccordionItem,
  OlivePromoSection,
  OliveReveal,
  OliveSection,
  OliveSectionHeading,
} from "../shared";
import { OliveContactMain } from "./olive-contact-main";
import { OliveContactMap } from "./olive-contact-map";

export async function OliveContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const { isEnabled } = await getBusinessFlags();

  const f = resolveFields(customFields, [
    "olive.contact.hero-heading",
    "olive.contact.hero-body",
    "olive.contact.form-heading",
    "olive.contact.form-body",
    "olive.contact.form-success-heading",
    "olive.contact.form-success-body",
    "olive.contact.info-visit-heading",
    "olive.contact.info-visit-body",
    "olive.contact.info-hours-heading",
    "olive.contact.faq-heading",
    "olive.contact.promo-takeover",
    "olive.contact.promo-image",
    "olive.contact.promo-heading",
    "olive.contact.promo-body",
    "olive.contact.promo-button-label",
    "olive.contact.promo-button-link",
    "olive.contact.map-heading",
  ]);

  const faq = resolveFaqPickerItems(
    customFields?.["olive.contact.faq"],
    faqItems,
    6,
  );

  // Contact details all come from Settings (Business) — never template fields.
  const address = business.businessAddress?.trim() ?? "";
  const phone = business.phoneNumber?.trim() ?? "";
  const email = business.supportEmail?.trim() ?? "";

  // Hours: Settings → Business Hours wins (rendered as label/value rows);
  // else the legacy saved free text (`olive.contact.info-hours-body`, retired
  // 2026-09-26 — a read-only fallback, never written or cleared from here);
  // else the hours block is hidden.
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );
  const legacyHours =
    getRawCustomFieldString(
      customFields,
      "olive.contact.info-hours-body",
    )?.trim() ?? "";

  // Map pin: Settings → General (Business.latitude/longitude) wins; else the
  // legacy saved `olive.contact.map-lat` / `map-lng` pair (retired
  // 2026-09-26, read-only fallback). No valid pair → the map is hidden.
  const coords = resolveMapCoordinates(
    business,
    getRawCustomFieldString(customFields, "olive.contact.map-lat"),
    getRawCustomFieldString(customFields, "olive.contact.map-lng"),
  );
  const mapUrls = coords ? googleMapsUrls(address || coords) : null;

  // B2.5: hide the promo button (never swap in another destination) when its
  // href names a flag that's off.
  const promoButtonRaw = f["olive.contact.promo-button-link"] ?? "";
  const promoButtonFlag = navHrefFlag(promoButtonRaw);
  const promoButtonHref =
    promoButtonFlag === null || isEnabled(promoButtonFlag)
      ? promoButtonRaw
      : "";

  return (
    <>
      <OliveSection
        as="section"
        aria-label="Say hello"
        tone="slate"
        {...sectionGroupAttr("contact", "hero")}
      >
        <OliveReveal>
          <OliveSectionHeading
            tone="slate"
            as="h1"
            heading={f["olive.contact.hero-heading"] ?? "Say hello"}
            body={f["olive.contact.hero-body"] ?? undefined}
            headingFieldKey="olive.contact.hero-heading"
            bodyFieldKey="olive.contact.hero-body"
          />
        </OliveReveal>
      </OliveSection>

      <OliveContactMain
        sectionAttrs={sectionGroupAttr("contact", "main")}
        formHeading={f["olive.contact.form-heading"] ?? "Send us a note"}
        formHeadingFieldKey="olive.contact.form-heading"
        formBody={f["olive.contact.form-body"] ?? ""}
        formBodyFieldKey="olive.contact.form-body"
        successHeading={f["olive.contact.form-success-heading"] ?? "Message sent"}
        successHeadingFieldKey="olive.contact.form-success-heading"
        successBody={
          f["olive.contact.form-success-body"] ??
          "We read every note and write back within a day or two."
        }
        successBodyFieldKey="olive.contact.form-success-body"
        visitHeading={f["olive.contact.info-visit-heading"] ?? "Visit"}
        visitHeadingFieldKey="olive.contact.info-visit-heading"
        address={address}
        visitNotes={f["olive.contact.info-visit-body"] ?? ""}
        visitNotesFieldKey="olive.contact.info-visit-body"
        phone={phone}
        email={email}
        hoursHeading={f["olive.contact.info-hours-heading"] ?? "Hours"}
        hoursHeadingFieldKey="olive.contact.info-hours-heading"
        hoursRows={hoursRows}
        legacyHours={legacyHours}
      />

      {faq.length > 0 &&
        isSectionVisible(customFields, "olive", "contact.faq") && (
          <OliveSection
            as="section"
            aria-label="Frequently asked questions"
            tone="paper"
            {...sectionGroupAttr("contact", "faq")}
          >
            <OliveReveal>
              <h2
                className="olive-h2 mb-6 text-center"
                {...fieldAttr("olive.contact.faq-heading")}
              >
                {f["olive.contact.faq-heading"] ?? "Questions we hear a lot"}
              </h2>
              <OliveAccordion type="single" className="mx-auto max-w-[720px]">
                {faq.map((row, i) => (
                  <OliveAccordionItem
                    key={row.id}
                    id={row.id}
                    title={row.question}
                    defaultOpen={i === 0}
                  >
                    {row.answer}
                  </OliveAccordionItem>
                ))}
              </OliveAccordion>
            </OliveReveal>
          </OliveSection>
        )}

      {isSectionVisible(customFields, "olive", "contact.promo") ? (
        <OlivePromoSection
          takeover={f["olive.contact.promo-takeover"] === "true"}
          image={f["olive.contact.promo-image"] ?? "/placeholder.svg"}
          heading={f["olive.contact.promo-heading"] ?? ""}
          body={f["olive.contact.promo-body"] ?? ""}
          buttonLabel={f["olive.contact.promo-button-label"] ?? ""}
          buttonLink={promoButtonHref}
          tone="sage-tint"
          id="olive-promo-contact"
          sectionAttrs={sectionGroupAttr("contact", "promo")}
          headingFieldKey="olive.contact.promo-heading"
          bodyFieldKey="olive.contact.promo-body"
          buttonLabelFieldKey="olive.contact.promo-button-label"
        />
      ) : null}

      {isSectionVisible(customFields, "olive", "contact.map") &&
        coords &&
        mapUrls && (
          <OliveContactMap
            sectionAttrs={sectionGroupAttr("contact", "map")}
            heading={f["olive.contact.map-heading"] ?? "Find us"}
            headingFieldKey="olive.contact.map-heading"
            businessName={business.name}
            address={address || undefined}
            latitude={coords.latitude}
            longitude={coords.longitude}
            viewUrl={mapUrls.viewUrl}
            directionsUrl={mapUrls.directionsUrl}
          />
        )}
    </>
  );
}
