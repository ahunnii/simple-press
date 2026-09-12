import type { DefaultContactPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { OliveAccordion, OliveAccordionItem, OliveSection } from "../shared";
import { OliveContactMain } from "./olive-contact-main";
import { OliveContactMap } from "./olive-contact-map";

// Built-in example FAQ, used when the owner hasn't configured any rows.
const DEFAULT_FAQ: TemplateListRow[] = [
  {
    _id: "default-faq-1",
    question: "What's your return policy?",
    answer:
      "Unworn pieces with tags can come back for an exchange or store credit — message us and we'll sort it out.",
  },
  {
    _id: "default-faq-2",
    question: "Do you ship outside Michigan?",
    answer:
      "Yes — we ship anywhere in the US, and every order leaves from Detroit with a tracking link.",
  },
  {
    _id: "default-faq-3",
    question: "How do I know what size to order?",
    answer:
      "Message us your usual size and the piece you're eyeing — we'll tell you how it actually fits before you buy.",
  },
  {
    _id: "default-faq-4",
    question: "Can I return a sale item?",
    answer:
      "Sale items are final sale, but we're happy to help you pick the right size before you buy.",
  },
  {
    _id: "default-faq-5",
    question: "Do you offer gift cards?",
    answer: "Not online yet — stop by the shop and we'll set one up for you.",
  },
  {
    _id: "default-faq-6",
    question: "Can you hold an item for me?",
    answer: "Yes, for 24 hours. Send us a message with the item and your size.",
  },
];

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function OliveContactPage({
  business,
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
    "olive.contact.map-heading",
    "olive.contact.map-lat",
    "olive.contact.map-lng",
  ]);

  const faqRows = parseTemplateListRows(customFields?.["olive.contact.faq"]);
  const faq = faqRows.length > 0 ? faqRows : DEFAULT_FAQ;

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

      {isSectionVisible(customFields, "olive", "contact.faq") && (
        <OliveSection
          as="section"
          aria-label="Frequently asked questions"
          tone="paper"
          {...sectionGroupAttr("contact", "faq")}
        >
          <h2
            className="olive-h2 mb-6 text-center"
            {...fieldAttr("olive.contact.faq-heading")}
          >
            {f["olive.contact.faq-heading"] ?? "Questions we hear a lot"}
          </h2>
          <OliveAccordion type="single" className="mx-auto max-w-[720px]">
            {faq.map((row, i) => (
              <OliveAccordionItem
                key={row._id ?? i}
                id={row._id ?? `faq-${i}`}
                title={readString(row, "question")}
                defaultOpen={i === 0}
              >
                {readString(row, "answer")}
              </OliveAccordionItem>
            ))}
          </OliveAccordion>
        </OliveSection>
      )}

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
