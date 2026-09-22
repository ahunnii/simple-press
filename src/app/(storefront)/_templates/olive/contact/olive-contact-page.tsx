import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { resolveFaqPickerItems } from "~/lib/template-fields";

import { resolveFields } from "..";
import {
  OliveAccordion,
  OliveAccordionItem,
  OlivePromoSection,
  OliveReveal,
  OliveSection,
} from "../shared";
import { OliveContactMain } from "./olive-contact-main";
import { OliveContactMap } from "./olive-contact-map";

export function OliveContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.contact.hero-heading",
    "olive.contact.hero-body",
    "olive.contact.form-heading",
    "olive.contact.form-body",
    "olive.contact.info-visit-heading",
    "olive.contact.info-visit-body",
    "olive.contact.info-hours-heading",
    "olive.contact.info-hours-body",
    "olive.contact.faq-heading",
    "olive.contact.promo-takeover",
    "olive.contact.promo-image",
    "olive.contact.promo-heading",
    "olive.contact.promo-body",
    "olive.contact.promo-button-label",
    "olive.contact.promo-button-link",
    "olive.contact.map-heading",
    "olive.contact.map-lat",
    "olive.contact.map-lng",
  ]);

  const faq = resolveFaqPickerItems(
    customFields?.["olive.contact.faq"],
    faqItems,
    6,
  );

  // Guard against `Number("")` coercing to `0` (a "valid" coordinate) — a
  // blank field must hide the map, not point it at the Gulf of Guinea.
  const latRaw = f["olive.contact.map-lat"] ?? "";
  const lngRaw = f["olive.contact.map-lng"] ?? "";
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const hasCoords =
    latRaw.trim() !== "" &&
    lngRaw.trim() !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const address = business.businessAddress ?? undefined;
  const mapDest = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

  return (
    <>
      <OliveSection
        as="section"
        aria-label="Say hello"
        tone="slate"
        {...sectionGroupAttr("contact", "hero")}
        className="flex flex-col items-center gap-3 text-center"
      >
        <OliveReveal className="flex flex-col items-center gap-3">
          <h1 className="olive-h1" {...fieldAttr("olive.contact.hero-heading")}>
            {f["olive.contact.hero-heading"] ?? "Say hello"}
          </h1>
          {f["olive.contact.hero-body"] ? (
            <p
              className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
              {...fieldAttr("olive.contact.hero-body")}
            >
              {f["olive.contact.hero-body"]}
            </p>
          ) : null}
        </OliveReveal>
      </OliveSection>

      <OliveContactMain
        sectionAttrs={sectionGroupAttr("contact", "main")}
        formHeading={f["olive.contact.form-heading"] ?? "Send us a note"}
        formHeadingFieldKey="olive.contact.form-heading"
        formBody={f["olive.contact.form-body"] ?? ""}
        formBodyFieldKey="olive.contact.form-body"
        visitHeading={f["olive.contact.info-visit-heading"] ?? "Visit"}
        visitHeadingFieldKey="olive.contact.info-visit-heading"
        visitBody={f["olive.contact.info-visit-body"] ?? ""}
        visitBodyFieldKey="olive.contact.info-visit-body"
        hoursHeading={f["olive.contact.info-hours-heading"] ?? "Hours"}
        hoursHeadingFieldKey="olive.contact.info-hours-heading"
        hoursBody={f["olive.contact.info-hours-body"] ?? ""}
        hoursBodyFieldKey="olive.contact.info-hours-body"
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
          buttonLink={f["olive.contact.promo-button-link"] ?? ""}
          tone="sage-tint"
          id="olive-promo-contact"
          sectionAttrs={sectionGroupAttr("contact", "promo")}
          headingFieldKey="olive.contact.promo-heading"
          bodyFieldKey="olive.contact.promo-body"
          buttonLabelFieldKey="olive.contact.promo-button-label"
        />
      ) : null}

      {isSectionVisible(customFields, "olive", "contact.map") && hasCoords && (
        <OliveContactMap
          sectionAttrs={sectionGroupAttr("contact", "map")}
          heading={f["olive.contact.map-heading"] ?? "Find us"}
          headingFieldKey="olive.contact.map-heading"
          businessName={business.name}
          address={address}
          latitude={lat}
          longitude={lng}
          viewUrl={viewUrl}
          directionsUrl={directionsUrl}
        />
      )}
    </>
  );
}
